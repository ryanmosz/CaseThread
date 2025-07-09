import React, { useState, useEffect } from 'react';
import { Card, CardBody, Button, Spinner } from '@heroui/react';
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
        throw new Error('Electron API not available. Please ensure preload script is loaded.');
      }

      // Load templates
      console.log('Loading templates...');
      const templatesResult = await window.electronAPI.loadTemplates();
      console.log('Templates result:', templatesResult);
      
      if (!templatesResult.success) {
        throw new Error(templatesResult.error || 'Failed to load templates');
      }

      // Load mock data directory tree
      console.log('Loading mock data...');
      const mockDataResult = await window.electronAPI.readDirectory('./mock-data');
      console.log('Mock data result:', mockDataResult);
      
      setState(prev => ({
        ...prev,
        templates: templatesResult.data || [],
        documentTree: mockDataResult.success ? mockDataResult.data || [] : [],
        isLoading: false,
      }));
    } catch (error) {
      console.error('Error loading initial data:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load initial data',
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
      
      const result = await window.electronAPI.generateDocument(
        state.selectedTemplate.id,
        formData
      );

      if (result.success && result.data) {
        setState(prev => ({
          ...prev,
          selectedDocument: result.data?.output || null,
          isLoading: false,
        }));
      } else {
        throw new Error(result.error || 'Document generation failed');
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Generation failed',
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
    <ErrorBoundary>
      <div className="h-screen flex flex-col bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">CaseThread</h1>
              <p className="text-sm text-gray-600">Legal Document Generator</p>
            </div>
            <div className="flex items-center space-x-4">
              {state.isLoading && <Spinner size="sm" />}
              <div className="text-sm text-gray-500">
                {state.templates.length} templates loaded
              </div>
            </div>
          </div>
        </header>

        {/* Main Content - Three Pane Layout */}
        <main className="flex-1 flex overflow-hidden">
          {/* Left Pane - Document Browser */}
          <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
            <div className="px-4 py-3 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Documents</h2>
            </div>
            <div className="flex-1 overflow-hidden">
              <DocumentBrowser
                documentTree={state.documentTree}
                onDocumentSelect={handleDocumentSelect}
              />
            </div>
          </div>

          {/* Middle Pane - Document Viewer */}
          <div className="flex-1 bg-white flex flex-col">
            <div className="px-6 py-3 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Document Viewer</h2>
            </div>
            <div className="flex-1 overflow-hidden">
              <DocumentViewer
                content={state.selectedDocument}
                isLoading={state.isLoading}
              />
            </div>
          </div>

          {/* Right Pane - Template Selector */}
          <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
            <div className="px-4 py-3 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Templates</h2>
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
        <footer className="bg-gray-100 border-t border-gray-200 px-6 py-2">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div>Ready</div>
            <div>
              {state.selectedTemplate && `Selected: ${state.selectedTemplate.name}`}
            </div>
          </div>
        </footer>
      </div>
    </ErrorBoundary>
  );
};

export default App; 