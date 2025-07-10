import React, { useState, useMemo } from 'react';
import { 
  Card, 
  CardBody, 
  CardHeader,
  Button, 
  Spinner, 
  Chip,
  Progress,
  Tabs,
  Tab,
  ScrollShadow,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem
} from '@heroui/react';

interface EnhancedDocumentViewerProps {
  content: string | null;
  isLoading: boolean;
  error: string | null;
  documentType?: string;
  generatedAt?: string;
  generationProgress?: number;
  generationStage?: string;
}

type ViewMode = 'preview' | 'raw' | 'metadata';

const EnhancedDocumentViewer: React.FC<EnhancedDocumentViewerProps> = ({
  content,
  isLoading,
  error,
  documentType,
  generatedAt,
  generationProgress = 0,
  generationStage = 'Preparing...'
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('preview');

  // Parse document metadata and content
  const { formattedContent, documentInfo } = useMemo(() => {
    if (!content) return { formattedContent: '', documentInfo: null };

    const lines = content.split('\n');
    const contentStart = lines.findIndex(line => line.trim() && !line.startsWith('#') && !line.includes(':'));
    const metadata = lines.slice(0, Math.max(0, contentStart));
    const documentContent = lines.slice(contentStart).join('\n');

    return {
      formattedContent: documentContent,
      documentInfo: {
        wordCount: documentContent.split(/\s+/).filter(word => word.length > 0).length,
        characterCount: documentContent.length,
        lineCount: lines.length,
        sections: (documentContent.match(/^#+ /gm) || []).length
      }
    };
  }, [content]);

  const handleExport = async (format: 'markdown' | 'text' | 'pdf') => {
    if (!content) return;

    try {
      const result = await window.electronAPI.showSaveDialog();

      if (!result.canceled && result.filePath) {
        await window.electronAPI.writeFile(
          result.filePath,
          format === 'text' ? formattedContent : content
        );
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const renderLoadingState = () => (
    <div className="flex flex-col items-center justify-center h-full p-8 space-y-6">
      <div className="relative">
        <Spinner size="lg" color="primary" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 bg-primary/10 rounded-full animate-pulse" />
        </div>
      </div>
      
      <div className="text-center space-y-3 max-w-md">
        <h3 className="text-lg font-semibold text-foreground">
          Generating Document
        </h3>
        <p className="text-sm text-foreground/60">
          {generationStage}
        </p>
        
        {generationProgress > 0 && (
          <div className="space-y-2">
            <Progress 
              value={generationProgress} 
              color="primary" 
              size="sm"
              className="w-full"
            />
            <p className="text-xs text-foreground/50">
              {Math.round(generationProgress)}% complete
            </p>
          </div>
        )}
      </div>
      
      <div className="flex items-center space-x-2 text-xs text-foreground/40">
        <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
        <span>AI agents are working on your document</span>
      </div>
    </div>
  );

  const renderErrorState = () => (
    <div className="flex flex-col items-center justify-center h-full p-8 space-y-6">
      <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
        <svg 
          className="w-8 h-8 text-red-600 dark:text-red-400" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.732 15.5c-.77.833.192 2.5 1.732 2.5z" 
          />
        </svg>
      </div>
      
      <div className="text-center space-y-3 max-w-md">
        <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">
          Generation Failed
        </h3>
        <p className="text-sm text-foreground/60">
          {error || 'An error occurred while generating the document'}
        </p>
      </div>
      
      <Button 
        color="primary" 
        variant="flat"
        onClick={() => window.location.reload()}
        startContent={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        }
      >
        Try Again
      </Button>
    </div>
  );

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center h-full p-8 space-y-6">
      <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
        <svg 
          className="w-10 h-10 text-primary/60" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
          />
        </svg>
      </div>
      
      <div className="text-center space-y-3">
        <h3 className="text-lg font-semibold text-foreground">
          No Document Selected
        </h3>
        <p className="text-sm text-foreground/60 max-w-sm">
          Select a template from the right panel to generate a legal document, 
          or browse existing documents from the left panel.
        </p>
      </div>
      
      <div className="flex items-center space-x-4 text-xs text-foreground/50">
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-primary/40 rounded-full" />
          <span>8 Templates Available</span>
        </div>
        <div className="w-px h-4 bg-divider" />
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-green-500/40 rounded-full" />
          <span>AI Ready</span>
        </div>
      </div>
    </div>
  );

  const renderDocumentContent = () => (
    <ScrollShadow className="h-full">
      <div className="p-6 space-y-6">
        <Tabs 
          selectedKey={viewMode} 
          onSelectionChange={(key) => setViewMode(key as ViewMode)}
          variant="underlined"
          color="primary"
        >
          <Tab key="preview" title="Preview" />
          <Tab key="raw" title="Raw" />
          <Tab key="metadata" title="Info" />
        </Tabs>

        {viewMode === 'preview' && (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <div 
              className="whitespace-pre-wrap font-mono text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ 
                __html: formattedContent
                  .replace(/\n\n/g, '</p><p>')
                  .replace(/^/, '<p>')
                  .replace(/$/, '</p>')
                  .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                  .replace(/\*(.*?)\*/g, '<em>$1</em>')
              }}
            />
          </div>
        )}

        {viewMode === 'raw' && (
          <div className="bg-background/50 border border-divider rounded-lg p-4">
            <pre className="text-xs text-foreground/80 whitespace-pre-wrap overflow-x-auto">
              {content}
            </pre>
          </div>
        )}

        {viewMode === 'metadata' && documentInfo && (
          <div className="grid grid-cols-2 gap-4">
            <Card className="border-divider">
              <CardBody className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary mb-1">
                    {documentInfo.wordCount.toLocaleString()}
                  </div>
                  <div className="text-xs text-foreground/60">Words</div>
                </div>
              </CardBody>
            </Card>
            
            <Card className="border-divider">
              <CardBody className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary mb-1">
                    {documentInfo.characterCount.toLocaleString()}
                  </div>
                  <div className="text-xs text-foreground/60">Characters</div>
                </div>
              </CardBody>
            </Card>
            
            <Card className="border-divider">
              <CardBody className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary mb-1">
                    {documentInfo.sections}
                  </div>
                  <div className="text-xs text-foreground/60">Sections</div>
                </div>
              </CardBody>
            </Card>
            
            <Card className="border-divider">
              <CardBody className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary mb-1">
                    {documentInfo.lineCount.toLocaleString()}
                  </div>
                  <div className="text-xs text-foreground/60">Lines</div>
                </div>
              </CardBody>
            </Card>
          </div>
        )}
      </div>
    </ScrollShadow>
  );

  if (isLoading) return renderLoadingState();
  if (error) return renderErrorState();
  if (!content) return renderEmptyState();

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-divider bg-background/50 backdrop-blur-sm p-4">
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
                  {documentType || 'Generated Document'}
                </h3>
                {generatedAt && (
                  <p className="text-xs text-foreground/60">
                    Generated {new Date(generatedAt).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
            
            {documentInfo && (
              <div className="flex items-center space-x-2">
                <Chip size="sm" variant="flat" color="primary">
                  {documentInfo.wordCount} words
                </Chip>
                <Chip size="sm" variant="flat" color="secondary">
                  {documentInfo.sections} sections
                </Chip>
              </div>
            )}
          </div>

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

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {renderDocumentContent()}
      </div>
    </div>
  );
};

export default EnhancedDocumentViewer; 