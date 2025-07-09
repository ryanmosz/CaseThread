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

    return (
      <div
        style={style}
        ref={dragHandle}
        className={`
          flex items-center px-3 py-2 cursor-pointer hover:bg-gray-100 
          ${node.isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : ''}
          ${node.isFocused ? 'bg-gray-50' : ''}
        `}
        onClick={handleClick}
      >
        {/* Toggle arrow for directories */}
        {node.isInternal && (
          <div className="w-4 h-4 mr-2 flex items-center justify-center">
            {node.isOpen ? (
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </div>
        )}
        
        {/* Icon for file/folder */}
        <div className="w-4 h-4 mr-3 flex items-center justify-center">
          {node.isInternal ? (
            node.isOpen ? (
              <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
              </svg>
            )
          ) : (
            <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
            </svg>
          )}
        </div>

        {/* File/folder name */}
        <span className={`text-sm ${node.isLeaf ? 'text-blue-600 hover:text-blue-800' : 'text-gray-700'}`}>
          {node.data.name}
        </span>
      </div>
    );
  };

  if (treeData.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        <p>No documents found</p>
        <p className="text-xs mt-1">Check your mock-data directory</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-hidden">
      <Tree
        data={treeData}
        openByDefault={false}
        width={300}
        height={600}
        indent={20}
        rowHeight={36}
        overscanCount={5}
        padding={8}
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