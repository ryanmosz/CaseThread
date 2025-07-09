import React from 'react';
import { Spinner } from '@heroui/react';

interface DocumentViewerProps {
  content: string | null;
  isLoading: boolean;
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({ content, isLoading }) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-600">Loading document...</p>
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-gray-500">
          <div className="text-6xl mb-4">📄</div>
          <h3 className="text-xl font-semibold mb-2">No Document Selected</h3>
          <p>Select a document from the browser to view its contents</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-hidden">
      <div className="custom-scrollbar overflow-y-auto h-full p-6">
        <div className="legal-document">
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
            {content}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default DocumentViewer; 