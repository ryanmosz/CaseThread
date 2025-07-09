import React from 'react';
import { DirectoryEntry } from '../../../../shared/types';

interface DocumentBrowserProps {
  documentTree: DirectoryEntry[];
  onDocumentSelect: (filePath: string) => void;
}

const DocumentBrowser: React.FC<DocumentBrowserProps> = ({ 
  documentTree, 
  onDocumentSelect 
}) => {
  const renderTreeItem = (item: DirectoryEntry, level: number = 0) => {
    const paddingLeft = level * 16;
    
    return (
      <div key={item.path}>
        <div
          className={`
            flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer
            ${!item.isDirectory ? 'text-blue-600 hover:text-blue-800' : 'text-gray-700'}
          `}
          style={{ paddingLeft: paddingLeft + 16 }}
          onClick={() => !item.isDirectory && onDocumentSelect(item.path)}
        >
          <span className="mr-2">
            {item.isDirectory ? '📁' : '📄'}
          </span>
          <span className="text-sm">{item.name}</span>
        </div>
      </div>
    );
  };

  if (documentTree.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        <p>No documents found</p>
        <p className="text-xs mt-1">Check your mock-data directory</p>
      </div>
    );
  }

  return (
    <div className="custom-scrollbar overflow-y-auto h-full">
      <div className="py-2">
        {documentTree.map(item => renderTreeItem(item))}
      </div>
    </div>
  );
};

export default DocumentBrowser; 