import React, { useState, useMemo } from 'react';
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
  Textarea
} from '@heroui/react';

interface EnhancedDocumentViewerProps {
  content: string | null;
  isLoading: boolean;
  error: string | null;
  documentName?: string;
  documentPath?: string;
  generatedAt?: string;
  generationProgress?: number;
  generationStage?: string;
}

const EnhancedDocumentViewer: React.FC<EnhancedDocumentViewerProps> = ({
  content,
  isLoading,
  error,
  documentName,
  documentPath,
  generatedAt,
  generationProgress = 0,
  generationStage = 'Preparing...'
}) => {
  const [editedContent, setEditedContent] = useState(content || '');
  
  // Parse document metadata and content
  const documentInfo = useMemo(() => {
    if (!content) return null;
    
    const wordCount = content.split(/\s+/).length;
    const sections = content.split(/^#{1,6}\s/m).length - 1;
    
    return { wordCount, sections };
  }, [content]);

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

  const isFormData = documentPath?.endsWith('form-data.yaml') || false;

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

      {/* Document Content */}
      <ScrollShadow className="flex-1 overflow-auto">
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
            />
          )}
        </div>
      </ScrollShadow>
    </div>
  );
};

export default EnhancedDocumentViewer; 