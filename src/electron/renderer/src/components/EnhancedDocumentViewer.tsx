import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  Card, 
  CardBody, 
  Button, 
  Spinner, 
  Chip,
  Progress,
  ScrollShadow,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Textarea,
  Divider,
  addToast
} from '@heroui/react';
import DiffViewer from './DiffViewer';

// Simple Error Boundary for diff viewer
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('DiffViewer Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

interface EnhancedDocumentViewerProps {
  content: string | null;
  isLoading: boolean;
  error: string | null;
  documentName?: string;
  documentPath?: string;
  generatedAt?: string;
  generationProgress?: number;
  generationStage?: string;
  onContentSaved?: (newContent: string) => void;
  suggestedContent?: string;
  onSuggestedContentAccepted?: () => void;
  onSuggestedContentRejected?: () => void;
}

const EnhancedDocumentViewer: React.FC<EnhancedDocumentViewerProps> = ({
  content,
  isLoading,
  error,
  documentName,
  documentPath,
  generatedAt,
  generationProgress = 0,
  generationStage = 'Preparing...',
  onContentSaved,
  suggestedContent,
  onSuggestedContentAccepted,
  onSuggestedContentRejected
}) => {
  const [editedContent, setEditedContent] = useState(content || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  
  // Update editedContent when content prop changes
  useEffect(() => {
    setEditedContent(content || '');
    setHasUnsavedChanges(false);
    setSaveStatus('idle');
    setSaveError(null);
  }, [content]);

  // Show diff when suggested content is provided
  useEffect(() => {
    if (suggestedContent && content && suggestedContent !== content) {
      // Add a small delay to prevent immediate rendering of large diffs
      const timer = setTimeout(() => {
        setShowDiff(true);
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [suggestedContent, content]);

  // Track content changes
  useEffect(() => {
    if (content !== null && editedContent !== content) {
      setHasUnsavedChanges(true);
    } else {
      setHasUnsavedChanges(false);
    }
  }, [editedContent, content]);

  // Save functionality
  const handleSave = useCallback(async () => {
    if (!documentPath || !hasUnsavedChanges) return;
    
    // Only allow saving .md files
    if (!documentPath.endsWith('.md')) {
      setSaveError('Only Markdown files can be saved');
      setSaveStatus('error');
      return;
    }

    try {
      setIsSaving(true);
      setSaveStatus('saving');
      setSaveError(null);

      // Create a minimum 1-second delay promise
      const minDelay = new Promise(resolve => setTimeout(resolve, 1000));
      
      // Run both the save operation and the minimum delay
      const [result] = await Promise.all([
        window.electronAPI.writeFile(documentPath, editedContent),
        minDelay
      ]);
      
      if (result.success) {
        setSaveStatus('success');
        setHasUnsavedChanges(false);
        
        // Show success toast immediately
        addToast({
          title: "Document saved successfully!",
          description: "Your changes have been saved.",
          color: "success",
          timeout: 3000,
        });
        
        // Call callback to notify parent component
        if (onContentSaved) {
          onContentSaved(editedContent);
        }
        
        // Show success for 2 seconds then return to idle
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        throw new Error(result.error || 'Failed to save file');
      }
    } catch (error) {
      console.error('Error saving file:', error);
      setSaveError(error instanceof Error ? error.message : 'Failed to save file');
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  }, [documentPath, editedContent, hasUnsavedChanges, onContentSaved]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === 's') {
        event.preventDefault();
        handleSave();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  // Handle export functions
  const handleExport = async (format: 'markdown' | 'text') => {
    try {
      const result = await window.electronAPI.showSaveDialog({
        defaultPath: `${documentName || 'document'}.${format === 'markdown' ? 'md' : 'txt'}`,
        filters: [
          { name: format === 'markdown' ? 'Markdown' : 'Text', extensions: [format === 'markdown' ? 'md' : 'txt'] }
        ]
      });

      if (result.success && result.data?.filePath) {
        await window.electronAPI.writeFile(result.data.filePath, editedContent);
      }
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  // Handle suggested content acceptance
  const handleAcceptSuggestedContent = useCallback((newContent: string) => {
    setEditedContent(newContent);
    setShowDiff(false);
    if (onSuggestedContentAccepted) {
      onSuggestedContentAccepted();
    }
  }, [onSuggestedContentAccepted]);

  // Handle suggested content rejection
  const handleRejectSuggestedContent = useCallback(() => {
    setShowDiff(false);
    if (onSuggestedContentRejected) {
      onSuggestedContentRejected();
    }
  }, [onSuggestedContentRejected]);
  
  // Parse document metadata and content
  const documentInfo = useMemo(() => {
    if (!content) return null;
    
    const wordCount = content.split(/\s+/).length;
    const sections = content.split(/^#{1,6}\s/m).length - 1;
    
    return { wordCount, sections };
  }, [content]);

  // Determine if this is a markdown file
  const isMarkdownFile = documentPath?.endsWith('.md') || false;
  const isFormData = documentPath?.endsWith('form-data.yaml') || false;

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Spinner size="lg" />
        <div className="ml-4">
          <p className="text-sm text-foreground/80">{generationStage}</p>
          <Progress value={generationProgress} className="max-w-md mt-2" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-danger">{error}</p>
      </div>
    );
  }

  // Show placeholder when no content is available
  if (!content && !isLoading && !error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mb-4 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-primary/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-foreground/80 mb-2">No document selected</h3>
          <p className="text-sm text-foreground/60 mb-4 max-w-md">
            Select a document from the browser on the left to view its contents, or generate a new document using the templates on the right.
          </p>
          <div className="flex items-center justify-center space-x-4 text-xs text-foreground/40">
            <span>📁 Browse documents</span>
            <span>•</span>
            <span>📝 Generate new</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-dashed border-divider bg-background/50 backdrop-blur-sm p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-sm text-foreground">
                  {documentName || 'Generated Document'}
                </h3>
                {generatedAt && (
                  <p className="text-xs text-foreground/60">
                    Generated {new Date(generatedAt).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Diff Toggle Button - show when suggested content is available */}
            {suggestedContent && content && (
              <Button
                variant={showDiff ? "solid" : "flat"}
                size="sm"
                color="secondary"
                onClick={() => setShowDiff(!showDiff)}
                startContent={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                }
              >
                {showDiff ? 'Hide Diff' : 'Show Changes'}
              </Button>
            )}

            {/* Save Button - only show for markdown files */}
            {isMarkdownFile && (
              <Button
                variant="flat"
                size="sm"
                color="primary"
                isLoading={isSaving}
                isDisabled={!hasUnsavedChanges || isSaving}
                onClick={handleSave}
                startContent={
                  !isSaving && (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                  )
                }
              >
                {isSaving ? 'Saving...' : 'Ctrl+S'}
              </Button>
            )}

            {/* Export Dropdown */}
            <Dropdown>
              <DropdownTrigger>
                <Button 
                  variant="flat" 
                  size="sm"
                  startContent={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  }
                >
                  Export
                </Button>
              </DropdownTrigger>
              <DropdownMenu>
                <DropdownItem
                  key="markdown"
                  onClick={() => handleExport('markdown')}
                  startContent={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  }
                >
                  Save as Markdown
                </DropdownItem>
                <DropdownItem
                  key="text"
                  onClick={() => handleExport('text')}
                  startContent={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  }
                >
                  Save as Text
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </div>
        </div>


      </div>

      {/* Document Content */}
      <div className="flex-1 overflow-hidden">
        {showDiff && suggestedContent && content ? (
          <ErrorBoundary fallback={
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <p className="text-danger mb-4">Unable to display document diff</p>
                <Button
                  variant="flat"
                  size="sm"
                  onClick={handleRejectSuggestedContent}
                >
                  Close Diff View
                </Button>
              </div>
            </div>
          }>
            <DiffViewer
              originalText={content}
              modifiedText={suggestedContent}
              title="AI Assistant Suggestions"
              onApplyChanges={handleAcceptSuggestedContent}
              onClose={handleRejectSuggestedContent}
            />
          </ErrorBoundary>
        ) : (
          <ScrollShadow className="h-full overflow-auto">
            <div className="p-6">
              {isFormData ? (
                <div className="bg-background/50 border border-divider rounded-lg p-4">
                  <pre className="text-xs text-foreground/80 whitespace-pre-wrap">
                    {content}
                  </pre>
                </div>
              ) : (
                <Textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="w-full h-full min-h-[500px] font-mono text-sm resize-none !overflow-hidden"
                  variant="bordered"
                  minRows={20}
                  maxRows={999}
                  placeholder={isMarkdownFile ? "Start typing to edit this document..." : "Document content"}
                  isReadOnly={!isMarkdownFile}
                />
              )}
            </div>
          </ScrollShadow>
        )}
      </div>
    </div>
  );
};

export default EnhancedDocumentViewer; 