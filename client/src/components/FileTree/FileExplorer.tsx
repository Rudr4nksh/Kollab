import React, { useState, useRef } from 'react';
import { 
  ChevronRight, 
  ChevronDown, 
  Folder, 
  FolderOpen, 
  Plus, 
  Upload, 
  FilePlus, 
  FolderPlus, 
  Trash2,
  FileCode
} from 'lucide-react';
import type { FileNode } from '../../types/index.ts';
import { getFileBadgeInfo, getLanguageFromFilename } from '../../services/fileUtils.ts';
import styles from './FileExplorer.module.css';

interface FileExplorerProps {
  files: FileNode[];
  activeFilePath: string;
  onSelectFile: (file: FileNode) => void;
  onCreateFile: (name: string, parentPath?: string) => void;
  onCreateFolder: (name: string, parentPath?: string) => void;
  onDeleteNode: (path: string) => void;
  onImportFolder: (importedFiles: FileNode[]) => void;
  isHost: boolean;
}

export const FileExplorer: React.FC<FileExplorerProps> = ({
  files,
  activeFilePath,
  onSelectFile,
  onCreateFile,
  onCreateFolder,
  onDeleteNode,
  onImportFolder,
  isHost: _isHost,
}) => {
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({
    '/app': true,
    '/src': true,
  });
  const [showNewMenu, setShowNewMenu] = useState(false);
  const [creatingType, setCreatingType] = useState<'file' | 'folder' | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [targetParentPath, setTargetParentPath] = useState<string | undefined>();
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleFolder = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenFolders((prev) => ({ ...prev, [path]: !prev[path] }));
  };

  const handleStartCreate = (type: 'file' | 'folder', parentPath?: string) => {
    setCreatingType(type);
    setTargetParentPath(parentPath);
    setNewItemName('');
    setShowNewMenu(false);
  };

  const handleConfirmCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newItemName.trim();
    if (!name) {
      setCreatingType(null);
      return;
    }

    if (creatingType === 'file') {
      onCreateFile(name, targetParentPath);
    } else if (creatingType === 'folder') {
      onCreateFolder(name, targetParentPath);
    }

    setCreatingType(null);
    setNewItemName('');
  };

  // HTML5 Directory Import (Native browser directory picker)
  const handleFolderUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploaded = e.target.files;
    if (!uploaded || uploaded.length === 0) return;

    const newNodesMap: Record<string, FileNode> = {};
    const rootNodes: FileNode[] = [];

    Array.from(uploaded).forEach((file) => {
      // webkitRelativePath is like "my-folder/src/app.js"
      const relativePath = file.webkitRelativePath || file.name;
      const parts = relativePath.split('/');

      let currentPath = '';
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const prevPath = currentPath;
        currentPath = currentPath ? `${currentPath}/${part}` : `/${part}`;

        if (i === parts.length - 1) {
          // It's a file
          const reader = new FileReader();
          reader.onload = (event) => {
            const content = event.target?.result as string || '';
            const fileNode: FileNode = {
              id: 'file_' + Math.random().toString(36).substring(2, 9),
              name: part,
              path: currentPath,
              type: 'file',
              language: getLanguageFromFilename(part),
              content,
            };

            if (prevPath && newNodesMap[prevPath]) {
              newNodesMap[prevPath].children = newNodesMap[prevPath].children || [];
              newNodesMap[prevPath].children?.push(fileNode);
            } else {
              rootNodes.push(fileNode);
            }
            onImportFolder([...files, ...rootNodes]);
          };
          reader.readAsText(file);
        } else {
          // It's a folder
          if (!newNodesMap[currentPath]) {
            const folderNode: FileNode = {
              id: 'folder_' + Math.random().toString(36).substring(2, 9),
              name: part,
              path: currentPath,
              type: 'folder',
              isOpen: true,
              children: [],
            };
            newNodesMap[currentPath] = folderNode;

            if (prevPath && newNodesMap[prevPath]) {
              newNodesMap[prevPath].children = newNodesMap[prevPath].children || [];
              newNodesMap[prevPath].children?.push(folderNode);
            } else {
              rootNodes.push(folderNode);
            }
          }
        }
      }
    });
  };

  const renderTree = (nodes: FileNode[], depth = 0) => {
    return nodes.map((node) => {
      const isFolder = node.type === 'folder';
      const isOpen = openFolders[node.path] ?? node.isOpen ?? true;
      const isActive = !isFolder && activeFilePath === node.path;
      const badge = !isFolder ? getFileBadgeInfo(node.name) : null;

      return (
        <div key={node.id} className={styles.treeItemWrapper}>
          <div
            className={`${styles.treeItem} ${isActive ? styles.activeTreeItem : ''}`}
            style={{ paddingLeft: `${depth * 14 + 10}px` }}
            onClick={(e) => {
              if (isFolder) {
                toggleFolder(node.path, e);
              } else {
                onSelectFile(node);
              }
            }}
          >
            {isFolder ? (
              <span className={styles.chevronIcon} onClick={(e) => toggleFolder(node.path, e)}>
                {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              </span>
            ) : (
              <span className={styles.fileSpacer} />
            )}

            {isFolder ? (
              isOpen ? (
                <FolderOpen size={14} className={styles.folderIcon} />
              ) : (
                <Folder size={14} className={styles.folderIcon} />
              )
            ) : (
              <span
                className={styles.fileTypeBadge}
                style={{ color: badge?.color, backgroundColor: badge?.bg }}
              >
                {badge?.label}
              </span>
            )}

            <span className={styles.nodeName}>{node.name}</span>

            {/* Hover Actions */}
            <div className={styles.hoverActions}>
              {isFolder && (
                <button
                  className={styles.actionBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartCreate('file', node.path);
                  }}
                  title="New File in folder"
                >
                  <Plus size={12} />
                </button>
              )}
              <button
                className={styles.actionBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteNode(node.path);
                }}
                title="Delete"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>

          {isFolder && isOpen && node.children && (
            <div className={styles.nestedChildren}>
              {renderTree(node.children, depth + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div
      className={`${styles.explorer} ${isDragOver ? styles.dragOver : ''}`}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        // Drag-and-drop folder handling
      }}
    >
      {/* Top Header matching reference */}
      <div className={styles.header}>
        <div className={styles.newButtonContainer}>
          <button
            className={styles.newPillBtn}
            onClick={() => setShowNewMenu(!showNewMenu)}
          >
            <span>New</span>
            <Plus size={14} />
          </button>

          {showNewMenu && (
            <div className={styles.newMenuDropdown}>
              <button onClick={() => handleStartCreate('file')}>
                <FilePlus size={13} />
                <span>New File</span>
              </button>
              <button onClick={() => handleStartCreate('folder')}>
                <FolderPlus size={13} />
                <span>New Folder</span>
              </button>
            </div>
          )}
        </div>

        {/* Project folder upload / dropdown button */}
        <button
          className={styles.openFolderBtn}
          onClick={() => fileInputRef.current?.click()}
          title="Open project folder from computer"
        >
          <Upload size={12} />
          <span>Open Folder</span>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          // @ts-ignore
          webkitdirectory="true"
          directory="true"
          multiple
          style={{ display: 'none' }}
          onChange={handleFolderUpload}
        />
      </div>

      {/* Inline Create Input Form */}
      {creatingType && (
        <form onSubmit={handleConfirmCreate} className={styles.inlineCreateForm}>
          <span className={styles.createIcon}>
            {creatingType === 'file' ? <FileCode size={13} /> : <Folder size={13} />}
          </span>
          <input
            type="text"
            className={styles.createInput}
            placeholder={creatingType === 'file' ? 'filename.js' : 'folder-name'}
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            autoFocus
            onBlur={() => {
              if (!newItemName.trim()) setCreatingType(null);
            }}
          />
        </form>
      )}

      {/* File Tree List */}
      <div className={styles.treeList}>
        {files.length === 0 ? (
          <div className={styles.emptyTree}>
            <p>Workspace is empty</p>
            <span>Click "New +" or Open Folder to add files</span>
          </div>
        ) : (
          renderTree(files)
        )}
      </div>
    </div>
  );
};
