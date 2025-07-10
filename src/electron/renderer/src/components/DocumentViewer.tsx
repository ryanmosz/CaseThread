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
// Professional SVG icons
const icons = {
  download: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  fileText: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  copy: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  ),
  eye: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ),
  eyeOff: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
    </svg>
  )
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

  // Inject custom scrollbar styles
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .custom-scrollbar::-webkit-scrollbar {
        width: 4px;
      }
      .custom-scrollbar::-webkit-scrollbar-track {
        background: transparent;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 2px;
        transition: background 0.2s ease;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.2);
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

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
    
    // Basic markdown-like formatting for better readability with theme-aware colors
    return text
      .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold mb-6 text-foreground border-b border-divider pb-2">$1</h1>')
      .replace(/^## (.*$)/gm, '<h2 class="text-xl font-semibold mb-4 text-foreground/90">$1</h2>')
      .replace(/^### (.*$)/gm, '<h3 class="text-lg font-semibold mb-3 text-foreground/80">$1</h3>')
      .replace(/^\*\*(.*)\*\*/gm, '<strong class="font-semibold text-foreground">$1</strong>')
      .replace(/^\*(.*)\*/gm, '<em class="italic text-foreground/80">$1</em>')
      .replace(/\n\n/g, '</p><p class="mb-4 text-foreground/80 leading-relaxed">')
      .replace(/\n/g, '<br/>')
      .replace(/^(.+)$/gm, '<p class="mb-4 text-foreground/80 leading-relaxed">$1</p>')
      .replace(/<p class="mb-4 text-foreground\/80 leading-relaxed"><h([1-3])/g, '<h$1')
      .replace(/<\/h([1-3])><\/p>/g, '</h$1>');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-card">
        <div className="text-center">
          <div className="w-16 h-16 mb-6 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <Spinner size="lg" color="primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Generating Document</h3>
          <p className="text-sm text-foreground/60 mb-1">This may take 30-60 seconds</p>
          <div className="mt-4 bg-foreground/5 rounded-lg px-4 py-2 inline-block">
            <p className="text-xs text-foreground/50">AI is analyzing your inputs...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-card">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mb-6 bg-red-50 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.083 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Generation Error</h3>
          <p className="text-sm text-foreground/60 mb-6 leading-relaxed">{error}</p>
          <div className="space-y-3">
            <Button 
              color="primary" 
              variant="solid"
              onClick={() => window.location.reload()}
              className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              startContent={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              }
            >
              Try Again
            </Button>
            <p className="text-xs text-foreground/40">
              If the issue persists, check your API configuration
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="flex items-center justify-center h-full bg-card">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 mb-6 bg-foreground/10 rounded-2xl flex items-center justify-center mx-auto">
            <svg className="w-10 h-10 text-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">No Document Selected</h3>
          <p className="text-sm text-foreground/60 mb-6 leading-relaxed">
            Select a document from the browser or generate a new one using templates
          </p>
          <div className="space-y-4">
            <div className="flex items-center justify-center space-x-3 text-sm">
              <div className="bg-foreground/5 px-3 py-1.5 rounded-lg">
                <span className="text-foreground/70">Browse existing</span>
              </div>
              <span className="text-foreground/40">or</span>
              <div className="bg-primary/10 px-3 py-1.5 rounded-lg">
                <span className="text-primary">Generate new</span>
              </div>
            </div>
            <div className="text-xs text-foreground/40">
              Documents will appear here once selected or generated
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-card">
      {/* Document Header */}
      <div className="flex-shrink-0 px-6 py-4 bg-gradient-to-r from-background to-background/50 backdrop-blur-sm border-b border-divider">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground tracking-tight">Generated Document</h3>
                <p className="text-xs text-foreground/60 mt-0.5">Legal document ready for review</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
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
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              isIconOnly
              variant="flat"
              size="sm"
              onClick={() => setIsPreviewMode(!isPreviewMode)}
              className="bg-foreground/5 hover:bg-foreground/10 transition-colors border border-divider/50 hover:border-divider"
              title={isPreviewMode ? "Switch to Raw Mode" : "Switch to Preview Mode"}
            >
              {isPreviewMode ? icons.eyeOff : icons.eye}
            </Button>
            
            <Button
              isIconOnly
              variant="flat"
              size="sm"
              onClick={handleCopy}
              className="bg-foreground/5 hover:bg-foreground/10 transition-colors border border-divider/50 hover:border-divider"
              title="Copy to Clipboard"
            >
              {icons.copy}
            </Button>
            
            <Dropdown>
              <DropdownTrigger>
                <Button
                  isIconOnly
                  variant="flat"
                  size="sm"
                  isLoading={isExporting}
                  className="bg-foreground/5 hover:bg-foreground/10 transition-colors border border-divider/50 hover:border-divider"
                  title="Export Document"
                >
                  {icons.download}
                </Button>
              </DropdownTrigger>
              <DropdownMenu className="bg-card border border-divider shadow-lg">
                <DropdownItem
                  key="markdown"
                  onClick={() => handleExport('md')}
                  startContent={icons.fileText}
                  className="hover:bg-foreground/5"
                >
                  Export as Markdown
                </DropdownItem>
                <DropdownItem
                  key="text"
                  onClick={() => handleExport('txt')}
                  startContent={icons.fileText}
                  className="hover:bg-foreground/5"
                >
                  Export as Text
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </div>
        </div>
      </div>

      {/* Document Content */}
      <div className="flex-1 overflow-hidden bg-background/50">
        <div className="custom-scrollbar overflow-y-auto h-full">
          <div className="max-w-4xl mx-auto p-8">
            <div className="bg-card rounded-xl shadow-lg border border-divider p-8 backdrop-blur-sm">
              {isPreviewMode ? (
                <div 
                  className="legal-document prose prose-slate max-w-none text-foreground"
                  dangerouslySetInnerHTML={{ __html: formatContent(content) }}
                />
              ) : (
                <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-foreground bg-background/50 p-6 rounded-lg border border-divider">
                  {content}
                </pre>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Document Footer */}
      <div className="flex-shrink-0 px-6 py-4 bg-gradient-to-r from-background to-background/50 border-t border-divider">
        <div className="flex items-center justify-between text-sm text-foreground/60">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>{content.split('\n').length} lines</span>
            </div>
            <div className="flex items-center space-x-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h4a1 1 0 011 1v2h4a1 1 0 110 2h-1v10a2 2 0 01-2 2H8a2 2 0 01-2-2V6H5a1 1 0 110-2h4z" />
              </svg>
              <span>{content.length.toLocaleString()} characters</span>
            </div>
            <div className="flex items-center space-x-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <span>~{Math.ceil(content.split(' ').length / 250)} pages</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="bg-foreground/10 px-3 py-1 rounded-full">
              <span className="text-xs font-medium text-foreground/70">
                {isPreviewMode ? 'Preview Mode' : 'Raw Mode'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentViewer; 