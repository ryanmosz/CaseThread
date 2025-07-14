import React from 'react';
import { Tree, NodeRendererProps } from 'react-arborist';
import { DirectoryEntry } from '../../../../shared/types';

interface DocumentBrowserProps {
  documentTree: DirectoryEntry[];
  onDocumentSelect: (filePath: string) => void;
}

interface TreeNode {
  id: string;
  name: string;
  isDirectory: boolean;
  path: string;
  children?: TreeNode[];
}

const DocumentBrowser: React.FC<DocumentBrowserProps> = ({ 
  documentTree, 
  onDocumentSelect
}) => {
  // Inject custom scrollbar and tree styles
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
      
      /* Remove default Tree component borders and outlines */
      .custom-scrollbar [role="treeitem"] {
        border: none !important;
        outline: none !important;
      }
      .custom-scrollbar [role="treeitem"]:focus {
        border: none !important;
        outline: none !important;
      }
      .custom-scrollbar [role="treeitem"][aria-selected="true"] {
        border: none !important;
        outline: none !important;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  // Convert DirectoryEntry to TreeNode format expected by react-arborist
  const convertToTreeNodes = (entries: DirectoryEntry[]): TreeNode[] => {
    return entries.map(entry => ({
      id: entry.path,
      name: entry.name,
      isDirectory: entry.isDirectory,
      path: entry.path,
      children: entry.children ? convertToTreeNodes(entry.children) : undefined
    }));
  };

  const treeData = convertToTreeNodes(documentTree);

  // Custom Node component for rendering each tree item
  const Node: React.FC<NodeRendererProps<TreeNode>> = ({ node, style, dragHandle }) => {
    const handleClick = () => {
      if (node.isLeaf) {
        // This is a file, call onDocumentSelect
        onDocumentSelect(node.data.path);
      } else {
        // This is a directory, toggle open/close
        node.toggle();
      }
    };

    const getFileIcon = (fileName: string) => {
      const ext = fileName.split('.').pop()?.toLowerCase();
      switch (ext) {
        case 'md':
          return (
            <div className="w-4 h-4 rounded bg-blue-500/20 flex items-center justify-center">
              <svg className="w-3 h-3 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
              </svg>
            </div>
          );
        case 'json':
          return (
            <div className="w-4 h-4 rounded bg-green-500/20 flex items-center justify-center">
              <svg className="w-3 h-3 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" clipRule="evenodd" />
              </svg>
            </div>
          );
        default:
          return (
            <div className="w-4 h-4 rounded bg-gray-500/20 flex items-center justify-center">
              <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
              </svg>
            </div>
          );
      }
    };

    return (
      <div
        style={style}
        ref={dragHandle}
        className={`
          group relative flex items-center h-full cursor-pointer
          transition-colors duration-200
          ${node.isSelected 
            ? 'bg-primary/10 text-primary' 
            : 'hover:bg-foreground/5 text-foreground/80 hover:text-foreground'
          }
        `}
        onClick={handleClick}
      >
        {/* Selection indicator */}
        {node.isSelected && (
          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary" />
        )}
        
        {/* Content container */}
        <div className="flex items-center w-full px-3 py-2">
          {/* Toggle arrow for directories */}
          {node.isInternal && (
            <div className="w-4 h-4 mr-2 flex items-center justify-center">
              <svg 
                className={`
                  w-3 h-3 text-foreground/50 transition-transform duration-200
                  ${node.isOpen ? 'rotate-90' : 'rotate-0'}
                `} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          )}
          
          {/* Icon for file/folder */}
          <div className="mr-3 flex items-center justify-center">
            {node.isInternal ? (
              <div className="w-4 h-4 rounded bg-orange-500/20 flex items-center justify-center">
                <svg className="w-3 h-3 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                </svg>
              </div>
            ) : (
              getFileIcon(node.data.name)
            )}
          </div>

          {/* File/folder name */}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">
              {node.data.name}
            </div>
            {node.isLeaf && (
              <div className="text-xs text-foreground/40 truncate">
                {node.data.path.split('/').slice(-2, -1)[0]}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (treeData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="w-12 h-12 mb-4 bg-foreground/10 rounded-lg flex items-center justify-center">
          <svg className="w-6 h-6 text-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
        </div>
        <h3 className="text-base font-medium text-foreground/80 mb-2">No documents found</h3>
        <p className="text-sm text-foreground/50 mb-4 max-w-xs">
          Documents will appear here once available
        </p>
        <div className="text-xs text-foreground/40 bg-foreground/5 px-3 py-1 rounded-md">
          Generated documents will appear in output/
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-hidden relative">
      <Tree
        data={treeData}
        openByDefault={false}
        indent={12}
        rowHeight={40}
        overscanCount={5}
        padding={0}
        disableDrag={true}
        disableEdit={true}
        disableMultiSelection={true}
        selectionFollowsFocus={true}
        className="custom-scrollbar"
      >
        {Node}
      </Tree>
    </div>
  );
};

export default DocumentBrowser; 