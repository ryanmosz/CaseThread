import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  Card, 
  CardBody, 
  CardHeader,
  Button,
  ButtonGroup,
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
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  addToast
} from '@heroui/react';
import DiffViewer from './DiffViewer';
import { PDFViewer } from './PDFViewer';
import { usePDFGeneration } from '../hooks/usePDFGeneration';
import { usePDFExport } from '../hooks/usePDFExport';
import { DocumentType } from '../../../../types';
import { ViewModeType, PDFMetadataExtended } from '../../../../types/pdf';
import { BlobURLManager } from '../services/BlobURLManager';

// PDF Icon Component
const PDFIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M9 17h6M9 13h6M9 9h4" />
  </svg>
);

// View mode icons
const TextIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const ViewIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

// Export icon
const DownloadIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

// Info icon
const InfoIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

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

// Metadata panel component
const PDFMetadataPanel = ({ 
  metadata, 
  isOpen, 
  onClose 
}: { 
  metadata: PDFMetadataExtended; 
  isOpen: boolean;
  onClose: () => void;
}) => {
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const copyMetadata = () => {
    const metadataText = `
PDF Metadata
============
Document Type: ${metadata.documentType}
Generated: ${new Date(metadata.generatedAt).toLocaleString()}
Generation Time: ${formatDuration(metadata.generationTime)}
File Size: ${formatFileSize(metadata.fileSize)}
Page Count: ${metadata.pageCount}
Signature Blocks: ${metadata.hasSignatureBlocks ? `Yes (${metadata.signatureBlockCount || 0})` : 'No'}
${metadata.fontSize ? `Font Size: ${metadata.fontSize}pt` : ''}
${metadata.lineSpacing ? `Line Spacing: ${metadata.lineSpacing}` : ''}
${metadata.warnings?.length ? `\nWarnings:\n${metadata.warnings.join('\n')}` : ''}
    `.trim();

    navigator.clipboard.writeText(metadataText);
    // Removed addToast as per new_code
  };

  if (!isOpen) return null;

  return (
    <Card className="absolute top-16 right-4 w-80 z-50 shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <h4 className="text-sm font-semibold">PDF Information</h4>
        <Button
          size="sm"
          variant="light"
          isIconOnly
          onClick={onClose}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </Button>
      </CardHeader>
      <CardBody className="space-y-3">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-foreground/60">Document Type:</span>
            <span className="font-medium capitalize">
              {metadata.documentType.replace(/-/g, ' ')}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-foreground/60">File Size:</span>
            <span className="font-medium">{formatFileSize(metadata.fileSize)}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-foreground/60">Page Count:</span>
            <span className="font-medium">{metadata.pageCount} pages</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-foreground/60">Generated:</span>
            <span className="font-medium">
              {new Date(metadata.generatedAt).toLocaleTimeString()}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-foreground/60">Generation Time:</span>
            <span className="font-medium">{formatDuration(metadata.generationTime)}</span>
          </div>
          
          {metadata.hasSignatureBlocks && (
            <div className="flex justify-between">
              <span className="text-foreground/60">Signature Blocks:</span>
              <span className="font-medium">{metadata.signatureBlockCount || 'Yes'}</span>
            </div>
          )}
        </div>

        {metadata.warnings && metadata.warnings.length > 0 && (
          <div className="mt-3 p-2 bg-warning/10 rounded-md">
            <p className="text-xs font-medium text-warning mb-1">Warnings:</p>
            <ul className="text-xs text-foreground/60 space-y-1">
              {metadata.warnings.map((warning, index) => (
                <li key={index}>• {warning}</li>
              ))}
            </ul>
          </div>
        )}

        <Button
          size="sm"
          variant="flat"
          className="w-full mt-3"
          onClick={copyMetadata}
          startContent={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          }
        >
          Copy Metadata
        </Button>
      </CardBody>
    </Card>
  );
};

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
  
  // New state for PDF features
  const [viewMode, setViewMode] = useState<ViewModeType>('text');
  const [showMetadata, setShowMetadata] = useState(false);
  
  // Blob URL Manager instance
  const blobURLManager = useMemo(() => BlobURLManager.getInstance(), []);
  
  // PDF Generation Hook
  const { 
    generatePDF, 
    isGenerating, 
    progress, 
    error: pdfError, 
    pdfBuffer,
    blobUrl,
    metadata
  } = usePDFGeneration();
  
  // PDF Export Hook
  const { exportPDF, isExporting, error: exportError } = usePDFExport();

  // Auto-generation effect
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const autoGenerate = urlParams.get('autoGenerate');
    const requestedDocType = urlParams.get('documentType');
    
    if (autoGenerate === 'true' && requestedDocType) {
      // Log the attempt
      console.log('[AutoGenerate] Auto-generation requested', {
        documentType: requestedDocType,
        hasDocumentName: !!documentName,
        hasContent: !!editedContent,
        contentLength: editedContent?.length || 0,
        isGenerating,
        hasBlobUrl: !!blobUrl
      });
      
      // Only proceed if we have content and not already generating
      if (documentName && editedContent && !isGenerating && !blobUrl) {
        console.log('[AutoGenerate] Triggering automatic PDF generation', {
          documentType: requestedDocType,
          documentName: documentName,
          contentLength: editedContent.length
        });
        
        // Add a small delay to ensure everything is loaded
        setTimeout(() => {
          const docType = requestedDocType as DocumentType || detectDocumentType(documentName);
          
          generatePDF({
            content: editedContent,
            documentType: docType,
            metadata: {
              title: documentName.replace(/\.[^/.]+$/, ''),
              author: 'CaseThread Auto-Generation',
              subject: `Auto-generated ${docType}`,
              keywords: `legal, ${docType}, auto-generated`,
              creator: 'CaseThread'
            }
          });
        }, 1000);
      }
    }
  }, [documentName, editedContent, isGenerating, blobUrl, generatePDF]);

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
        window.electron.writeFile(documentPath, editedContent),
        minDelay
      ]);
      
      if (result.success) {
        setSaveStatus('success');
        setHasUnsavedChanges(false);
        
        // Show success toast immediately
        // Removed addToast as per new_code
        
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

  // Clean up blob URL when component unmounts
  useEffect(() => {
    return () => {
      if (blobUrl) {
        // Removed clearPDF() as per new_code
      }
    };
  }, []);

  // Reset view mode and clear PDF when document changes
  useEffect(() => {
    if (blobUrl) {
      // Removed clearPDF() as per new_code
    }
    setViewMode('text');
    setShowMetadata(false);
  }, [documentPath]);

  // Show PDF error in toast
  useEffect(() => {
    if (pdfError) {
      console.error('[EnhancedDocumentViewer] PDF generation error:', pdfError);
      addToast({
        title: 'PDF Generation Failed',
        description: pdfError,
        type: 'error'
      });
    }
  }, [pdfError]);

  // Show export error in toast
  useEffect(() => {
    if (exportError) {
      console.error('[EnhancedDocumentViewer] PDF export error:', exportError);
      addToast({
        title: 'PDF Export Failed',
        description: exportError,
        type: 'error'
      });
    }
  }, [exportError]);
  
  // Show PDF success in toast and switch to PDF view
  useEffect(() => {
    if (blobUrl && metadata) {
      console.log('[EnhancedDocumentViewer] PDF generated successfully');
      addToast({
        title: 'PDF Generated',
        description: `Successfully generated ${metadata.pageCount || 0} page PDF`,
        type: 'success'
      });
      // Automatically switch to PDF view
      setViewMode('pdf');
    }
  }, [blobUrl, metadata]);

  // Handle suggested content acceptance
  const handleAcceptSuggestedContent = useCallback(async (newContent: string) => {
    setEditedContent(newContent);
    setShowDiff(false);
    
    // Automatically save the changes if this is a markdown file
    if (documentPath?.endsWith('.md')) {
      try {
        setIsSaving(true);
        setSaveStatus('saving');
        setSaveError(null);

        // Create a minimum 1-second delay promise
        const minDelay = new Promise(resolve => setTimeout(resolve, 1000));
        
        // Run both the save operation and the minimum delay
        const [result] = await Promise.all([
          window.electron.writeFile(documentPath, newContent),
          minDelay
        ]);
        
        if (result.success) {
          setSaveStatus('success');
          setHasUnsavedChanges(false);
          
          // Show success toast
          // Removed addToast as per new_code
          
          // Call callback to notify parent component
          if (onContentSaved) {
            onContentSaved(newContent);
          }
          
          // Show success for 2 seconds then return to idle
          setTimeout(() => setSaveStatus('idle'), 2000);
        } else {
          throw new Error(result.error || 'Failed to save file');
        }
      } catch (error) {
        console.error('Error saving AI changes:', error);
        setSaveError(error instanceof Error ? error.message : 'Failed to save AI changes');
        setSaveStatus('error');
        
        // Removed addToast as per new_code
      } finally {
        setIsSaving(false);
      }
    }
    
    if (onSuggestedContentAccepted) {
      onSuggestedContentAccepted();
    }
  }, [onSuggestedContentAccepted, documentPath, onContentSaved]);

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

  // Handle export functions
  const handleExport = async (format: 'markdown' | 'text') => {
    try {
      const result = await window.electron.showSaveDialog({
        defaultPath: `${documentName || 'document'}.${format === 'markdown' ? 'md' : 'txt'}`,
        filters: [
          { name: format === 'markdown' ? 'Markdown' : 'Text', extensions: [format === 'markdown' ? 'md' : 'txt'] }
        ]
      });

      if (result.success && result.data?.filePath) {
        await window.electron.writeFile(result.data.filePath, editedContent);
      }
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  // Document type detection for PDF generation
  const detectDocumentType = (docName: string): DocumentType => {
    const name = docName.toLowerCase();
    if (name.includes('patent-assignment')) return 'patent-assignment-agreement';
    if (name.includes('cease-and-desist')) return 'cease-and-desist-letter';
    if (name.includes('nda')) return 'nda-ip-specific';
    if (name.includes('patent-license')) return 'patent-license-agreement';
    if (name.includes('provisional-patent')) return 'provisional-patent-application';
    if (name.includes('trademark')) return 'trademark-application';
    if (name.includes('office-action')) return 'office-action-response';
    if (name.includes('technology-transfer')) return 'technology-transfer-agreement';
    return 'patent-assignment-agreement'; // default
  };

  // PDF Generation handler
  const handleGeneratePDF = useCallback(() => {
    console.log('[EnhancedDocumentViewer] Generate PDF clicked', {
      hasEditedContent: !!editedContent,
      editedContentLength: editedContent?.length || 0,
      documentName: documentName || 'undefined'
    });
    
    if (!editedContent) {
      console.error('[EnhancedDocumentViewer] Cannot generate PDF: No content available');
      addToast({
        title: 'No Content',
        description: 'No content to generate PDF from',
        type: 'error'
      });
      return;
    }
    
    if (!documentName) {
      console.error('[EnhancedDocumentViewer] Cannot generate PDF: No document name');
      addToast({
        title: 'No Document',
        description: 'No document selected',
        type: 'error'
      });
      return;
    }
    
    const docType = detectDocumentType(documentName);
    console.log('[EnhancedDocumentViewer] Generating PDF for document type:', docType);
    
    generatePDF({
      content: editedContent,
      documentType: docType,
      metadata: {
        title: documentName.replace(/\.[^/.]+$/, ''),
        author: 'CaseThread',
        subject: `Legal Document - ${docType}`,
        keywords: `legal, ${docType}`,
        creator: 'CaseThread PDF Generator'
      }
    });
  }, [editedContent, documentName, generatePDF]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Spinner size="lg" />
        <div className="ml-4">
          <p className="text-sm text-foreground/80">{generationStage}</p>
          <Progress 
            value={generationProgress} 
            className="max-w-md mt-2" 
            aria-label="Document generation progress"
          />
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
      <div className="border-b-dashed-custom border-gray-500 dark:border-gray-400 bg-background/50 backdrop-blur-sm p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-sm text-foreground truncate" title={documentName || 'Generated Document'}>
                {documentName || 'Generated Document'}
              </h3>
              {generatedAt && (
                <p className="text-xs text-foreground/60 truncate">
                  Generated {new Date(generatedAt).toLocaleString()}
                </p>
              )}
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
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            )}

            {/* View Mode Toggle */}
            <ButtonGroup>
              <Button
                variant={viewMode === 'text' ? 'solid' : 'flat'}
                size="sm"
                color={viewMode === 'text' ? 'primary' : 'default'}
                onClick={() => setViewMode('text')}
                startContent={<TextIcon />}
                isDisabled={!content}
              >
                Text
              </Button>
              <Button
                variant={viewMode === 'pdf' ? 'solid' : 'flat'}
                size="sm"
                color={viewMode === 'pdf' ? 'primary' : 'default'}
                onClick={() => setViewMode('pdf')}
                startContent={<ViewIcon />}
                isDisabled={!blobUrl}
              >
                PDF
              </Button>
            </ButtonGroup>

            {/* Generate PDF Button */}
            <Button
              variant="flat"
              size="sm"
              color="primary"
              isLoading={isGenerating}
              isDisabled={!editedContent || isGenerating}
              onClick={handleGeneratePDF}
              startContent={!isGenerating && <PDFIcon />}
            >
              {isGenerating ? 
                (progress ? `${progress.percentage}%` : 'Generating...') : 
                'Generate PDF'
              }
            </Button>

            {/* Export PDF Button */}
            <Button
              variant="flat"
              size="sm"
              color="primary"
              isLoading={isExporting}
              isDisabled={!pdfBuffer || isExporting}
              onClick={() => {
                if (pdfBuffer && documentName) {
                  const docType = detectDocumentType(documentName);
                  exportPDF(
                    pdfBuffer, 
                    documentName.replace(/\.[^/.]+$/, '') + '.pdf',
                    docType
                  );
                }
              }}
              startContent={!isExporting && <DownloadIcon />}
            >
              {isExporting ? 'Exporting...' : 'Export PDF'}
            </Button>
          </div>
        </div>


      </div>

      {/* Document Content */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'text' ? (
          // Text/Markdown view
          showDiff && suggestedContent && content ? (
            <ErrorBoundary fallback={
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <p className="text-foreground/60 mb-2">Error rendering diff view</p>
                  <Button size="sm" variant="flat" onClick={() => setShowDiff(false)}>
                    Return to normal view
                  </Button>
                </div>
              </div>
            }>
              <DiffViewer
                original={content}
                modified={suggestedContent}
                onAccept={handleAcceptSuggestedContent}
                onReject={handleRejectSuggestedContent}
                onToggle={() => setShowDiff(!showDiff)}
              />
            </ErrorBoundary>
          ) : (
            <ScrollShadow className="h-full overflow-auto">
              <div className="p-6">
                {isFormData ? (
                  // YAML/JSON viewer for form data files
                  <Card className="border-none shadow-none">
                    <CardBody>
                      <pre className="text-sm font-mono bg-default-100 p-4 rounded-lg overflow-auto">
                        {editedContent}
                      </pre>
                    </CardBody>
                  </Card>
                ) : (
                  // Editable textarea for markdown files
                  <Textarea
                    className="font-mono"
                    minRows={30}
                    maxRows={100}
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    placeholder="Start typing..."
                    variant="bordered"
                    isReadOnly={!isMarkdownFile}
                  />
                )}
                
                {documentInfo && (
                  <div className="flex items-center space-x-6 mt-4 pt-4 border-t">
                    <Chip variant="flat" size="sm">
                      {documentInfo.wordCount} words
                    </Chip>
                    <Chip variant="flat" size="sm">
                      {documentInfo.sections} sections
                    </Chip>
                  </div>
                )}
              </div>
            </ScrollShadow>
          )
        ) : (
          // PDF view
          <div className="h-full w-full">
            {blobUrl ? (
              <PDFViewer 
                url={blobUrl} 
                onClose={() => setViewMode('text')} 
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <p className="text-foreground/60 mb-4">No PDF generated yet</p>
                  <Button 
                    color="primary"
                    onClick={handleGeneratePDF}
                    isLoading={isGenerating}
                  >
                    Generate PDF
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* PDF Generation Progress Modal */}
      {isGenerating && progress && (
        <Modal 
          isOpen={isGenerating} 
          // Removed onClose={cancelGeneration} as per new_code
          size="sm"
        >
          <ModalContent>
            <ModalHeader>Generating PDF</ModalHeader>
            <ModalBody>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-foreground/60 mb-2">{progress.step}</p>
                  {progress.detail && (
                    <p className="text-xs text-foreground/40">{progress.detail}</p>
                  )}
                </div>
                
                <Progress 
                  value={progress.percentage} 
                  color="primary"
                  aria-label="PDF generation progress"
                />
                
                {progress.estimatedTimeRemaining !== undefined && (
                  <p className="text-xs text-foreground/40 text-center">
                    Estimated time remaining: {progress.estimatedTimeRemaining}s
                  </p>
                )}
              </div>
            </ModalBody>
            <ModalFooter>
              {/* Removed Cancel button as per new_code */}
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}

      {/* PDF Metadata Panel */}
      {metadata && (
        <PDFMetadataPanel
          metadata={metadata}
          isOpen={showMetadata}
          onClose={() => setShowMetadata(false)}
        />
      )}
    </div>
  );
};

export default EnhancedDocumentViewer; 