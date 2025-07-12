import React, { useState, useEffect } from 'react';
import { Card, CardBody, Button, Spinner, addToast } from '@heroui/react';
import { ThemeProvider } from './components/ThemeProvider';
import ThemeSwitcher from './components/ThemeSwitcher';
import DocumentBrowser from './components/DocumentBrowser';
import EnhancedDocumentViewer from './components/EnhancedDocumentViewer';
import TemplateSelector from './components/TemplateSelector';
import { Template, DirectoryEntry } from '../../../shared/types';

// Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('React Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-screen">
          <Card className="max-w-md">
            <CardBody>
              <div className="text-center">
                <h2 className="text-xl font-semibold text-red-600 mb-2">Application Error</h2>
                <p className="text-gray-600 mb-4">
                  {this.state.error?.message || 'An unknown error occurred'}
                </p>
                <Button 
                  color="primary" 
                  onClick={() => window.location.reload()}
                >
                  Reload Application
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

interface AppState {
  templates: Template[];
  selectedTemplate: Template | null;
  selectedDocument: {
    content: string;
    path: string;
    name: string;
  } | null;
  documentTree: DirectoryEntry[];
  isLoading: boolean;
  error: string | null;
}

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    templates: [],
    selectedTemplate: null,
    selectedDocument: null,
    documentTree: [],
    isLoading: true,
    error: null,
  });

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // Check if electronAPI is available
      if (!window.electronAPI) {
        throw new Error('Application not properly initialized. Please restart the application.');
      }

      // Load templates with better error handling
      console.log('Loading templates...');
      const templatesResult = await window.electronAPI.loadTemplates();
      console.log('Templates result:', templatesResult);
      
      if (!templatesResult.success) {
        const templateError = templatesResult.error || 'Failed to load templates';
        if (templateError.includes('ENOENT')) {
          throw new Error('Template directory not found. Please ensure templates are properly installed.');
        } else if (templateError.includes('permission')) {
          throw new Error('Permission denied accessing templates. Please check file permissions.');
        } else {
          throw new Error(`Template loading error: ${templateError}`);
        }
      }

      // Load output directory tree with fallback
      console.log('Loading output directory...');
      const outputResult = await window.electronAPI.readDirectory('./output');
      console.log('Output directory result:', outputResult);
      
      // Create output directory if it doesn't exist
      if (!outputResult.success && outputResult.error?.includes('ENOENT')) {
        console.log('Creating output directory...');
        await window.electronAPI.writeFile('./output/.gitkeep', '');
        // Try loading again after creating directory
        const retryResult = await window.electronAPI.readDirectory('./output');
        if (retryResult.success) {
          outputResult.success = true;
          outputResult.data = retryResult.data;
        }
      }
      
      setState(prev => ({
        ...prev,
        templates: templatesResult.data || [],
        documentTree: outputResult.success ? outputResult.data || [] : [],
        isLoading: false,
      }));
    } catch (error) {
      console.error('Error loading initial data:', error);
      
      let userFriendlyError = 'Failed to load application data';
      
      if (error instanceof Error) {
        if (error.message.includes('not properly initialized')) {
          userFriendlyError = 'Application initialization failed. Please restart the application.';
        } else if (error.message.includes('Template directory not found')) {
          userFriendlyError = 'Template files are missing. Please reinstall the application.';
        } else if (error.message.includes('Permission denied')) {
          userFriendlyError = 'File permission error. Please check file permissions or run as administrator.';
        } else {
          userFriendlyError = error.message;
        }
      }
      
      setState(prev => ({
        ...prev,
        error: userFriendlyError,
        isLoading: false,
      }));
    }
  };

  const handleTemplateSelect = (template: Template) => {
    setState(prev => ({ ...prev, selectedTemplate: template }));
  };

  const refreshDocumentTree = async () => {
    try {
      console.log('Refreshing document tree...');
      const outputResult = await window.electronAPI.readDirectory('./output');
      if (outputResult.success) {
        setState(prev => ({
          ...prev,
          documentTree: outputResult.data || [],
        }));
      }
    } catch (error) {
      console.error('Error refreshing document tree:', error);
    }
  };

  const handleDocumentSelect = async (filePath: string) => {
    try {
      const result = await window.electronAPI.readFile(filePath);
      if (result.success && result.data) {
        setState(prev => ({ 
          ...prev, 
          selectedDocument: {
            content: result.data || '',
            path: filePath,
            name: filePath.split('/').pop() || 'Untitled Document',
          }
        }));
      }
    } catch (error) {
      console.error('Error reading document:', error);
    }
  };

  const handleGenerateDocument = async (formData: any) => {
    if (!state.selectedTemplate) return;

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      console.log('App: Starting document generation with template:', state.selectedTemplate.id);
      console.log('App: Form data:', formData);
      
      // Ensure template ID is serializable
      const templateId = state.selectedTemplate.id;
      if (!templateId || typeof templateId !== 'string') {
        throw new Error('Invalid template selected');
      }
      
      // Ensure form data is clean and serializable
      const cleanFormData = JSON.parse(JSON.stringify(formData));
      
      console.log('App: Calling generateDocument with:', { templateId, cleanFormData });
      
      const result = await window.electronAPI.generateDocument(
        templateId,
        cleanFormData
      );

      console.log('App: Generation result:', result);

      if (result.success && result.data) {
        // Use the actual document content that was read from the generated file
        const documentContent = result.data.documentContent || result.data.output || '';
        
        console.log('App: Document content length:', documentContent.length);
        console.log('App: Document preview:', documentContent.substring(0, 200));
        
        if (documentContent.trim()) {
          setState(prev => ({
            ...prev,
            selectedDocument: {
              content: documentContent,
              path: result.data?.savedFilePath || `output/${result.data?.folderName || 'document-folder'}/document.md`,
              name: `${state.selectedTemplate?.name || 'Document'} - Generated`,
            },
            isLoading: false,
          }));
          
          // Show success toast with folder path
          const folderName = result.data?.folderName || 'document-folder';
          const categoryFolder = result.data?.categoryFolder || '';
          const folderPath = categoryFolder ? `output/${categoryFolder}/${folderName}` : `output/${folderName}`;
          addToast({
            title: `${state.selectedTemplate?.name || 'Document'} generated successfully!`,
            description: `Saved to: ${folderPath}`,
            color: "success",
            timeout: 7000,
          });
          
          // Refresh document tree to show the new file
          await refreshDocumentTree();
          
          console.log('App: Document generation successful');
        } else {
          throw new Error('Generated document is empty');
        }
      } else {
        // More specific error handling
        let errorMessage = 'Document generation failed';
        
        if (result.error) {
          if (result.error.includes('timeout')) {
            errorMessage = 'Generation timed out. Please try again with a simpler template.';
          } else if (result.error.includes('OpenAI')) {
            errorMessage = 'AI service error. Please check your OpenAI API key and try again.';
          } else if (result.error.includes('template')) {
            errorMessage = 'Template error. Please check the template configuration.';
          } else if (result.error.includes('YAML')) {
            errorMessage = 'Form data error. Please check your form inputs.';
          } else if (result.error.includes('CLI command not found')) {
            errorMessage = 'System error. Please restart the application.';
          } else {
            errorMessage = `Generation error: ${result.error}`;
          }
        }
        
        console.error('App: Generation failed:', errorMessage);
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('App: Document generation error:', error);
      
      let userFriendlyError = 'Document generation failed';
      
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch') || error.message.includes('Network')) {
          userFriendlyError = 'Network error. Please check your internet connection and try again.';
        } else if (error.message.includes('timeout')) {
          userFriendlyError = 'Generation is taking too long. Please try again or use a simpler template.';
        } else if (error.message.includes('cloned')) {
          userFriendlyError = 'Form data processing error. Please refresh the page and try again.';
        } else {
          userFriendlyError = error.message;
        }
      }
      
      // Show error toast
      addToast({
        title: "Document Generation Failed",
        description: userFriendlyError,
        color: "danger",
        timeout: 6000,
      });
      
      setState(prev => ({
        ...prev,
        error: userFriendlyError,
        isLoading: false,
      }));
    }
  };

  const handleContentSaved = (newContent: string) => {
    // Update the selected document content in state
    setState(prev => ({
      ...prev,
      selectedDocument: prev.selectedDocument ? {
        ...prev.selectedDocument,
        content: newContent,
      } : null,
    }));
  };

  if (state.isLoading && state.templates.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-600">Loading CaseThread...</p>
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="max-w-md">
          <CardBody>
            <div className="text-center">
              <h2 className="text-xl font-semibold text-red-600 mb-2">Error</h2>
              <p className="text-gray-600 mb-4">{state.error}</p>
              <Button color="primary" onClick={loadInitialData}>
                Retry
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <ThemeProvider defaultTheme="light">
      <ErrorBoundary>
        <div className="h-screen flex flex-col bg-background">
          {/* Header */}
          <header className="bg-card border-b border-dashed border-divider/60 px-8 py-5 backdrop-blur-sm supports-[backdrop-filter]:bg-background/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <svg 
                      className="w-7 h-7 text-primary" 
                      xmlns="http://www.w3.org/2000/svg" 
                      viewBox="0 0 16 16"
                      aria-hidden="true"
                    >
                      <path 
                        fill="currentColor" 
                        d="M14.63 7L13 3h1V2H9V1H8v1H3v1h1L2.38 7H2v1h.15c.156.498.473.93.9 1.23a2.47 2.47 0 0 0 2.9 0A2.44 2.44 0 0 0 6.86 8H7V7h-.45L4.88 3H8v8H6l-.39.18l-2 2.51l.39.81h9l.39-.81l-2-2.51L11 11H9V3h3.13l-1.67 4H10v1h.15a2.48 2.48 0 0 0 4.71 0H15V7h-.37zM5.22 8.51a1.52 1.52 0 0 1-.72.19a1.45 1.45 0 0 1-.71-.19A1.47 1.47 0 0 1 3.25 8h2.5a1.52 1.52 0 0 1-.53.51zM5.47 7h-2l1-2.4l1 2.4zm5.29 5L12 13.5H5L6.24 12h4.52zm1.78-7.38l1 2.4h-2l1-2.4zm.68 3.91a1.41 1.41 0 0 1-.72.19a1.35 1.35 0 0 1-.71-.19a1.55 1.55 0 0 1-.54-.53h2.5a1.37 1.37 0 0 1-.53.53z" 
                      />
                    </svg>
                  </div>
                </div>
                <div>
                  <div className="flex items-baseline space-x-2">
                    <h1 className="text-2xl font-bold text-foreground tracking-tight">
                      CaseThread
                    </h1>
                    <div className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                      Beta
                    </div>
                  </div>
                  <p className="text-sm text-foreground/60 mt-0.5">
                    Legal Document Generator
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-card border border-divider/60">
                  <svg 
                    className="w-4 h-4 text-foreground/40" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" 
                    />
                  </svg>
                  <span className="text-sm text-foreground/70">
                    {state.templates.length} templates
                  </span>
                </div>
                <div className="w-px h-6 bg-divider/60" />
                <ThemeSwitcher />
              </div>
            </div>
          </header>

          {/* Main Content - Three Pane Layout */}
          <main className="flex-1 flex overflow-hidden">
            {/* Left Pane - Document Browser */}
            <div className="w-80 bg-card border-r border-dashed border-divider flex flex-col">
              <div className="border-b border-dashed border-divider bg-background/50 backdrop-blur-sm p-4">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                    </div>
                  </div>
                  <div>
                    <h2 className="font-semibold text-sm text-foreground">Documents</h2>
                    <p className="text-xs text-foreground/60">Browse your legal documents</p>
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-hidden">
                          <DocumentBrowser
            documentTree={state.documentTree}
            onDocumentSelect={handleDocumentSelect}
          />
              </div>
            </div>

            {/* Middle Pane - Document Viewer */}
            <div className="flex-1 bg-card flex flex-col">
              <EnhancedDocumentViewer
                content={state.selectedDocument?.content || ''}
                isLoading={state.isLoading}
                error={state.error}
                documentName={state.selectedDocument?.name || ''}
                documentPath={state.selectedDocument?.path || ''}
                generatedAt={new Date().toISOString()}
                onContentSaved={handleContentSaved}
              />
            </div>

            {/* Right Pane - Template Selector */}
            <div className="w-80 bg-card border-l border-dashed border-divider flex flex-col">
              <div className="border-b border-dashed border-divider bg-background/50 backdrop-blur-sm p-4">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                      </svg>
                    </div>
                  </div>
                  <div>
                    <h2 className="font-semibold text-sm text-foreground">Templates</h2>
                    <p className="text-xs text-foreground/60">Generate new documents</p>
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-hidden">
                <TemplateSelector
                  templates={state.templates}
                  selectedTemplate={state.selectedTemplate}
                  onTemplateSelect={handleTemplateSelect}
                  onGenerateDocument={handleGenerateDocument}
                />
              </div>
            </div>
          </main>

          {/* Status Bar */}
          <footer className="bg-card border-t border-divider px-6 py-2">
            <div className="flex items-center justify-between text-sm text-foreground/60">
              <div>Ready</div>
              <div>
                {state.selectedDocument 
                  ? state.selectedDocument.path 
                  : 'No document selected'
                }
              </div>
            </div>
          </footer>
        </div>
      </ErrorBoundary>
    </ThemeProvider>
  );
};

export default App; 