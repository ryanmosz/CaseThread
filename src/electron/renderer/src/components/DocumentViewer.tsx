import React, { useState, useEffect } from 'react';
import { 
  Spinner, 
  Button, 
  Dropdown, 
  DropdownTrigger, 
  DropdownMenu, 
  DropdownItem,
  Card,
  CardBody,
  Chip,
  Divider
} from '@heroui/react';
// Using simple text icons instead of lucide-react
const icons = {
  download: '↓',
  fileText: '📄',
  copy: '📋',
  eye: '👁️',
  eyeOff: '🙈'
};

interface DocumentViewerProps {
  content: string | null;
  isLoading: boolean;
  error?: string | null;
  documentType?: string;
  generatedAt?: string;
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({ 
  content, 
  isLoading, 
  error,
  documentType,
  generatedAt 
}) => {
  const [isPreviewMode, setIsPreviewMode] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const handleCopy = async () => {
    if (content) {
      try {
        await navigator.clipboard.writeText(content);
        // Could add toast notification here
      } catch (err) {
        console.error('Failed to copy text:', err);
      }
    }
  };

  const handleExport = async (format: string) => {
    if (!content) return;
    
    setIsExporting(true);
    try {
      const result = await window.electronAPI.showSaveDialog({
        defaultPath: `legal-document-${Date.now()}.${format}`,
        filters: [
          { name: 'Markdown', extensions: ['md'] },
          { name: 'Text', extensions: ['txt'] },
          { name: 'All Files', extensions: ['*'] }
        ],
      });

      if (!result.canceled && result.filePath) {
        await window.electronAPI.writeFile(result.filePath, content);
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const formatContent = (text: string) => {
    if (!isPreviewMode) return text;
    
    // Basic markdown-like formatting for better readability
    return text
      .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold mb-4 text-gray-900">$1</h1>')
      .replace(/^## (.*$)/gm, '<h2 class="text-xl font-semibold mb-3 text-gray-800">$1</h2>')
      .replace(/^### (.*$)/gm, '<h3 class="text-lg font-semibold mb-2 text-gray-700">$1</h3>')
      .replace(/^\*\*(.*)\*\*/gm, '<strong class="font-semibold">$1</strong>')
      .replace(/^\*(.*)\*/gm, '<em class="italic">$1</em>')
      .replace(/\n\n/g, '</p><p class="mb-4">')
      .replace(/\n/g, '<br/>')
      .replace(/^(.+)$/gm, '<p class="mb-4">$1</p>')
      .replace(/<p class="mb-4"><h([1-3])/g, '<h$1')
      .replace(/<\/h([1-3])><\/p>/g, '</h$1>');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Spinner size="lg" color="primary" />
          <p className="mt-4 text-gray-600">Generating document...</p>
          <p className="text-sm text-gray-500 mt-1">This may take 30-60 seconds</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="max-w-md">
          <CardBody>
            <div className="text-center">
              <div className="text-red-500 text-4xl mb-4">⚠️</div>
              <h3 className="text-lg font-semibold text-red-600 mb-2">Generation Error</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button 
                color="primary" 
                variant="light"
                onClick={() => window.location.reload()}
              >
                Try Again
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-gray-500">
          <div className="text-6xl mb-4">📄</div>
          <h3 className="text-xl font-semibold mb-2">No Document Selected</h3>
          <p className="mb-4">Select a document from the browser or generate a new one</p>
          <div className="flex items-center justify-center space-x-4 text-sm">
            <Chip size="sm" variant="flat" color="default">
              Browse existing documents
            </Chip>
            <span className="text-gray-400">or</span>
            <Chip size="sm" variant="flat" color="primary">
              Generate new document
            </Chip>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Document Header */}
      <div className="flex-shrink-0 p-4 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <span className="text-gray-600">{icons.fileText}</span>
              <span className="font-medium text-gray-900">Generated Document</span>
            </div>
            {documentType && (
              <Chip size="sm" color="primary" variant="flat">
                {documentType}
              </Chip>
            )}
            {generatedAt && (
              <Chip size="sm" color="default" variant="flat">
                {new Date(generatedAt).toLocaleString()}
              </Chip>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              isIconOnly
              variant="light"
              size="sm"
              onClick={() => setIsPreviewMode(!isPreviewMode)}
            >
              {isPreviewMode ? icons.eyeOff : icons.eye}
            </Button>
            
            <Button
              isIconOnly
              variant="light"
              size="sm"
              onClick={handleCopy}
            >
              {icons.copy}
            </Button>
            
            <Dropdown>
              <DropdownTrigger>
                <Button
                  isIconOnly
                  variant="light"
                  size="sm"
                  isLoading={isExporting}
                >
                  {icons.download}
                </Button>
              </DropdownTrigger>
              <DropdownMenu>
                <DropdownItem
                  key="markdown"
                  onClick={() => handleExport('md')}
                  startContent={<span>{icons.fileText}</span>}
                >
                  Export as Markdown
                </DropdownItem>
                <DropdownItem
                  key="text"
                  onClick={() => handleExport('txt')}
                  startContent={<span>{icons.fileText}</span>}
                >
                  Export as Text
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </div>
        </div>
      </div>

      {/* Document Content */}
      <div className="flex-1 overflow-hidden">
        <div className="custom-scrollbar overflow-y-auto h-full">
          <div className="max-w-4xl mx-auto p-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
              {isPreviewMode ? (
                <div 
                  className="legal-document prose prose-slate max-w-none"
                  dangerouslySetInnerHTML={{ __html: formatContent(content) }}
                />
              ) : (
                <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-gray-800">
                  {content}
                </pre>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Document Footer */}
      <div className="flex-shrink-0 p-4 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center space-x-4">
            <span>
              {content.split('\n').length} lines
            </span>
            <span>
              {content.length} characters
            </span>
            <span>
              ~{Math.ceil(content.split(' ').length / 250)} pages
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs">
              {isPreviewMode ? 'Preview Mode' : 'Raw Mode'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentViewer; 