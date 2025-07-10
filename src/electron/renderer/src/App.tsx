import React, { useState, useEffect } from 'react';
import { Card, CardBody, Button, Spinner } from '@heroui/react';
import { ThemeProvider } from './components/ThemeProvider';
import ThemeSwitcher from './components/ThemeSwitcher';
import DocumentBrowser from './components/DocumentBrowser';
import DocumentViewer from './components/DocumentViewer';
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
  selectedDocument: string | null;
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

      // Load mock data directory tree with fallback
      console.log('Loading mock data...');
      const mockDataResult = await window.electronAPI.readDirectory('./mock-data');
      console.log('Mock data result:', mockDataResult);
      
      // Don't fail the entire app if mock data fails to load
      if (!mockDataResult.success) {
        console.warn('Mock data loading failed:', mockDataResult.error);
      }
      
      setState(prev => ({
        ...prev,
        templates: templatesResult.data || [],
        documentTree: mockDataResult.success ? mockDataResult.data || [] : [],
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

  const handleDocumentSelect = async (filePath: string) => {
    try {
      const result = await window.electronAPI.readFile(filePath);
      if (result.success && result.data) {
        setState(prev => ({ 
          ...prev, 
          selectedDocument: result.data || null 
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
            selectedDocument: documentContent,
            isLoading: false,
          }));
          
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
      
      setState(prev => ({
        ...prev,
        error: userFriendlyError,
        isLoading: false,
      }));
    }
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
          <header className="bg-card border-b border-divider px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground">CaseThread</h1>
                <p className="text-sm text-foreground/70">Legal Document Generator</p>
              </div>
              <div className="flex items-center space-x-4">
                {state.isLoading && <Spinner size="sm" />}
                <div className="text-sm text-foreground/60">
                  {state.templates.length} templates loaded
                </div>
                <ThemeSwitcher />
              </div>
            </div>
          </header>

          {/* Main Content - Three Pane Layout */}
          <main className="flex-1 flex overflow-hidden">
            {/* Left Pane - Document Browser */}
            <div className="w-80 bg-card border-r border-divider flex flex-col">
              <div className="px-4 py-3 border-b border-divider">
                <h2 className="text-lg font-semibold text-foreground">Documents</h2>
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
              <div className="px-6 py-3 border-b border-divider">
                <h2 className="text-lg font-semibold text-foreground">Document Viewer</h2>
              </div>
              <div className="flex-1 overflow-hidden">
                <DocumentViewer
                  content={state.selectedDocument}
                  isLoading={state.isLoading}
                  error={state.error}
                  documentType={state.selectedTemplate?.name}
                  generatedAt={new Date().toISOString()}
                />
              </div>
            </div>

            {/* Right Pane - Template Selector */}
            <div className="w-80 bg-card border-l border-divider flex flex-col">
              <div className="px-4 py-3 border-b border-divider">
                <h2 className="text-lg font-semibold text-foreground">Templates</h2>
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
                {state.selectedTemplate && `Selected: ${state.selectedTemplate.name}`}
              </div>
            </div>
          </footer>
        </div>
      </ErrorBoundary>
    </ThemeProvider>
  );
};

export default App; 