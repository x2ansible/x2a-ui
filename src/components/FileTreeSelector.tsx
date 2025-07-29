"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { ChevronRightIcon, ChevronDownIcon, DocumentTextIcon, FolderIcon } from "@heroicons/react/24/outline";

export interface TreeNode {
  type: "file" | "folder";
  name: string;
  path?: string;
  items?: TreeNode[];
}

interface FileTreeSelectorProps {
  fetchTree: (path?: string) => Promise<TreeNode[]>;
  selectedFiles: string[];
  setSelectedFiles: (files: string[]) => void;
  technologyType?: string;
}

export default function FileTreeSelector({ 
  fetchTree, 
  selectedFiles, 
  setSelectedFiles,
  technologyType = 'chef'
}: FileTreeSelectorProps) {
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [filteredFiles, setFilteredFiles] = useState<string[]>([]);

  // Load tree data for specific technology folder
  const loadTree = useCallback(async () => {
    setLoading(true);
    try {
      // First get the root tree to find the technology folder
      const rootData = await fetchTree();
      
      // Find the technology folder
      const techFolder = rootData.find(node => 
        node.type === 'folder' && 
        node.name.toLowerCase() === technologyType.toLowerCase()
      );

      if (techFolder && techFolder.items) {
        // Show content of the technology folder
        setTreeData(techFolder.items);
        
        // Extract all files from the technology folder
        const extractFiles = (nodes: TreeNode[], basePath: string = ''): string[] => {
          const files: string[] = [];
          nodes.forEach(node => {
            const currentPath = basePath ? `${basePath}/${node.name}` : node.name;
            if (node.type === 'file') {
              // Include the technology folder in the path
              files.push(`${technologyType}/${currentPath}`);
            } else if (node.type === 'folder' && node.items) {
              files.push(...extractFiles(node.items, currentPath));
            }
          });
          return files;
        };
        
        const availableFiles = extractFiles(techFolder.items);
        setFilteredFiles(availableFiles);
        
        // Auto-expand first level folders
        const autoExpand = new Set<string>();
        techFolder.items.forEach(node => {
          if (node.type === 'folder') {
            autoExpand.add(node.name);
          }
        });
        setExpandedFolders(autoExpand);
        
        console.log(`📁 Loaded ${technologyType} folder:`, {
          folders: techFolder.items.filter(n => n.type === 'folder').length,
          files: availableFiles.length,
          availableFiles
        });
        
      } else {
        // Technology folder doesn't exist, show empty
        setTreeData([]);
        setFilteredFiles([]);
        console.log(`📁 No ${technologyType} folder found in uploads`);
      }
      
    } catch (error) {
      console.error('Failed to load file tree:', error);
      setTreeData([]);
      setFilteredFiles([]);
    } finally {
      setLoading(false);
    }
  }, [fetchTree, technologyType]);

  // Reload when technology changes
  useEffect(() => {
    loadTree();
    setSelectedFiles([]);
  }, [technologyType, loadTree, setSelectedFiles]);

  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(path)) {
        newExpanded.delete(path);
      } else {
        newExpanded.add(path);
      }
      return newExpanded;
    });
  };

  const toggleFileSelection = (filePath: string) => {
    setSelectedFiles(
      selectedFiles.includes(filePath)
        ? selectedFiles.filter(f => f !== filePath)
        : [...selectedFiles, filePath]
    );
  };

  const selectAllFiles = () => {
    setSelectedFiles(filteredFiles);
  };

  const clearSelection = () => {
    setSelectedFiles([]);
  };

  const renderNode = (node: TreeNode, level = 0, parentPath = ''): React.ReactNode => {
    const currentPath = parentPath ? `${parentPath}/${node.name}` : node.name;
    const fullPath = `${technologyType}/${currentPath}`;
    const isExpanded = expandedFolders.has(currentPath);
    const isSelected = selectedFiles.includes(fullPath);
    
    return (
      <div key={currentPath} className={`ml-${level * 4}`}>
        <div
          className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
            node.type === 'file'
              ? isSelected
                ? 'bg-blue-600/30 text-blue-300'
                : 'hover:bg-gray-700/50 text-gray-300'
              : 'hover:bg-gray-700/30 text-gray-400'
          }`}
          onClick={() => {
            if (node.type === 'folder') {
              toggleFolder(currentPath);
            } else {
              toggleFileSelection(fullPath);
            }
          }}
        >
          {node.type === 'folder' ? (
            <>
              {isExpanded ? (
                <ChevronDownIcon className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRightIcon className="w-4 h-4 text-gray-500" />
              )}
              <FolderIcon className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-medium">{node.name}</span>
              {node.items && (
                <span className="text-xs text-gray-500 ml-auto">
                  ({node.items.filter(item => item.type === 'file').length} files)
                </span>
              )}
            </>
          ) : (
            <>
              <div className="w-4 h-4"></div>
              <DocumentTextIcon className="w-4 h-4 text-blue-400" />
              <span className="text-sm">{node.name}</span>
              {isSelected && (
                <div className="w-2 h-2 bg-blue-500 rounded-full ml-auto"></div>
              )}
            </>
          )}
        </div>
        
        {node.type === 'folder' && isExpanded && node.items && (
          <div className="ml-4">
            {node.items.map(child => renderNode(child, level + 1, currentPath))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
        <span className="ml-2 text-gray-400">Loading {technologyType} folder...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
          📁 👨‍🍳 /{technologyType}/ folder
        </h4>
        <div className="text-xs text-gray-500">
          {filteredFiles.length} files
        </div>
      </div>

      {/* Selection controls */}
      {filteredFiles.length > 0 && (
        <div className="flex gap-2">
          <button
            onClick={selectAllFiles}
            disabled={selectedFiles.length === filteredFiles.length}
            className="text-xs px-2 py-1 bg-blue-600/20 text-blue-300 rounded hover:bg-blue-600/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Select All ({filteredFiles.length})
          </button>
          {selectedFiles.length > 0 && (
            <button
              onClick={clearSelection}
              className="text-xs px-2 py-1 bg-gray-600/20 text-gray-300 rounded hover:bg-gray-600/30"
            >
              Clear ({selectedFiles.length})
            </button>
          )}
        </div>
      )}

      {/* File tree */}
      <div className="bg-gray-800/30 rounded-lg border border-gray-700/50 max-h-64 overflow-y-auto rh-scrollbar">
        {treeData.length > 0 ? (
          <div className="p-2">
            {treeData.map(node => renderNode(node))}
          </div>
        ) : (
          <div className="p-4 text-center text-gray-500">
            <FolderIcon className="w-8 h-8 mx-auto mb-2 text-gray-600" />
            <p className="text-sm">No /{technologyType}/ folder found</p>
            <p className="text-xs text-gray-600 mt-1">
              Upload files to uploads/{technologyType}/ to see them here
            </p>
          </div>
        )}
      </div>

      {/* Selection summary */}
      {selectedFiles.length > 0 && (
        <div className="bg-blue-900/20 rounded-lg p-3 border border-blue-500/30">
          <div className="text-sm text-blue-300 font-medium mb-1">
            Selected Files ({selectedFiles.length})
          </div>
          <div className="space-y-1 max-h-20 overflow-y-auto rh-scrollbar">
            {selectedFiles.slice(0, 3).map(file => (
              <div key={file} className="text-xs text-gray-400 truncate">
                📄 {file}
              </div>
            ))}
            {selectedFiles.length > 3 && (
              <div className="text-xs text-gray-500">
                ... and {selectedFiles.length - 3} more files
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
