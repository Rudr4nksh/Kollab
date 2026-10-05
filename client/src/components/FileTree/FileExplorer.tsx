import React, { useState, useRef, useEffect } from 'react';
import { 
  ChevronRight, 
  ChevronDown, 
  Folder, 
  FolderOpen, 
  Upload, 
  FilePlus, 
  FolderPlus, 
  Trash2,
  FileCode,
  Undo2,
  Redo2,
  Edit2
} from 'lucide-react';
import type { FileNode } from '../../types/index.ts';
import { 
  getFileBadgeInfo, 
  getLanguageFromFilename, 
  findFileByPath, 
  parseDroppedItems 
} from '../../services/fileUtils.ts';
import styles from './FileExplorer.module.css';

interface FileExplorerProps {
  files: FileNode[];
  activeFilePath: string;
  onSelectFile: (file: FileNode) => void;
  onCreateFile: (name: string, parentPath?: string) => void;
  onCreateFolder: (name: string, parentPath?: string) => void;
  onDeleteNode: (path: string) => void;
  onRenameNode?: (oldPath: string, newName: string) => void;
  onImportFolder: (importedFiles: FileNode[]) => void;
  isHost: boolean;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
}

export const FileExplorer: React.FC<FileExplorerProps> = ({
  files,
  activeFilePath,
  onSelectFile,
  onCreateFile,
  onCreateFolder,
  onDeleteNode,
  onRenameNode,
  onImportFolder,
  isHost: _isHost,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
}) => {
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({
    '/app': true,
    '/src': true,
  });
  const [creatingType, setCreatingType] = useState<'file' | 'folder' | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [targetParentPath, setTargetParentPath] = useState<string | undefined>();
  const [isDragOver, setIsDragOver] = useState(false);
  const dragCounterRef = useRef(0);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragOver(true);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current--;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDragOver(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current = 0;
    setIsDragOver(false);
    if (e.dataTransfer) {
      try {
        const dropped = await parseDroppedItems(e.dataTransfer);
        if (dropped && dropped.length > 0) {
          onImportFolder([...files, ...dropped]);
        }
      } catch (err) {
        console.error('Failed to import dropped files:', err);
      }
    }
  };

  // In-place renaming state
  const [editingPath, setEditingPath] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingPath && renameInputRef.current) {
      renameInputRef.current.focus();
      const dotIdx = editingName.lastIndexOf('.');
      if (dotIdx > 0) {
        renameInputRef.current.setSelectionRange(0, dotIdx);
      } else {
        renameInputRef.current.select();
      }
    }
  }, [editingPath]);

  const handleStartRename = (node: FileNode, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingPath(node.path);
    setEditingName(node.name);
  };

  const handleConfirmRename = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editingPath) return;
    const trimmed = editingName.trim();
    if (trimmed && trimmed !== editingPath.split('/').pop()) {
      onRenameNode?.(editingPath, trimmed);
    }
    setEditingPath(null);
    setEditingName('');
  };

  // Keyboard shortcut listener for F2 rename
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        const targetPath = selectedPath || activeFilePath;
        if (!targetPath) return;
        const targetNode = findFileByPath(files, targetPath);
        if (targetNode) {
          e.preventDefault();
          handleStartRename(targetNode);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPath, activeFilePath, files]);

  const toggleFolder = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenFolders((prev) => ({ ...prev, [path]: !prev[path] }));
  };

  const handleStartCreate = (type: 'file' | 'folder', parentPath?: string) => {
    setCreatingType(type);
    setTargetParentPath(parentPath);
    setNewItemName('');
    if (parentPath) {
      setOpenFolders((prev) => ({ ...prev, [parentPath]: true }));
    }
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
            const content = (event.target?.result as string) || '';
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

  const renderInlineCreateInput = (depth: number) => {
    const liveBadge = creatingType === 'file' && newItemName.includes('.')
      ? getFileBadgeInfo(newItemName)
      : null;

    return (
      <div
        key="inline-create-row"
        className={styles.inlineCreateRow}
        style={{ paddingLeft: `${depth * 14 + 10}px` }}
      >
        <span className={styles.fileSpacer} />
        {creatingType === 'file' ? (
          liveBadge ? (
            <span
              className={styles.fileTypeBadge}
              style={{ color: liveBadge.color, backgroundColor: liveBadge.bg }}
            >
              {liveBadge.label}
            </span>
          ) : (
            <FileCode size={13} className={styles.createIcon} />
          )
        ) : (
          <Folder size={14} className={styles.folderIcon} />
        )}
        <form onSubmit={handleConfirmCreate} className={styles.inlineCreateForm}>
          <input
            type="text"
            className={styles.inlineCreateInput}
            placeholder={creatingType === 'file' ? 'filename.ext (e.g. index.js, main.cpp)' : 'folder-name'}
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setCreatingType(null);
                setNewItemName('');
              }
            }}
            onBlur={() => {
              if (!newItemName.trim()) {
                setCreatingType(null);
              }
            }}
            autoFocus
          />
        </form>
      </div>
    );
  };

  const renderTree = (nodes: FileNode[], depth = 0, currentParentPath?: string) => {
    return (
      <>
        {creatingType && targetParentPath === currentParentPath && renderInlineCreateInput(depth)}
        {nodes.map((node) => {
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
                  setSelectedPath(node.path);
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

                {editingPath === node.path ? (
                  <form
                    onSubmit={handleConfirmRename}
                    className={styles.inlineRenameForm}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      ref={renameInputRef}
                      type="text"
                      className={styles.inlineRenameInput}
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          e.stopPropagation();
                          setEditingPath(null);
                        }
                      }}
                      onBlur={() => handleConfirmRename()}
                      autoFocus
                    />
                  </form>
                ) : (
                  <span
                    className={styles.nodeName}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      handleStartRename(node);
                    }}
                    title="Double-click or press F2 to rename"
                  >
                    {node.name}
                  </span>
                )}

                {/* Hover Actions */}
                <div className={styles.hoverActions}>
                  {isFolder && (
                    <>
                      <button
                        className={styles.actionBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartCreate('file', node.path);
                        }}
                        title="New File in folder (e.g. main.cpp, script.js)"
                      >
                        <FilePlus size={12} />
                      </button>
                      <button
                        className={styles.actionBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartCreate('folder', node.path);
                        }}
                        title="New Folder in folder"
                      >
                        <FolderPlus size={12} />
                      </button>
                    </>
                  )}
                  <button
                    className={styles.actionBtn}
                    onClick={(e) => handleStartRename(node, e)}
                    title="Rename (F2)"
                  >
                    <Edit2 size={12} />
                  </button>
                  <button
                    className={`${styles.actionBtn} ${styles.deleteBtn}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteNode(node.path);
                    }}
                    title={isFolder ? 'Delete folder' : 'Delete file'}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

              {isFolder && isOpen && (
                <div className={styles.nestedChildren}>
                  {renderTree(node.children || [], depth + 1, node.path)}
                </div>
              )}
            </div>
          );
        })}
      </>
    );
  };

  return (
    <div
      className={`${styles.explorer} ${isDragOver ? styles.dragOver : ''}`}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Top Header matching VS Code Explorer */}
      <div className={styles.header}>
        <span className={styles.headerTitle}>EXPLORER</span>

        <div className={styles.headerActions}>
          <button
            className={styles.headerActionBtn}
            onClick={() => handleStartCreate('file')}
            title="New File (e.g. index.js, main.cpp, style.css)"
          >
            <FilePlus size={14} />
          </button>

          <button
            className={styles.headerActionBtn}
            onClick={() => handleStartCreate('folder')}
            title="New Folder..."
          >
            <FolderPlus size={14} />
          </button>

          <button
            className={styles.headerActionBtn}
            onClick={() => fileInputRef.current?.click()}
            title="Open Folder from computer"
          >
            <Upload size={14} />
          </button>

          {onUndo && (
            <button
              className={`${styles.headerActionBtn} ${!canUndo ? styles.headerActionBtnDisabled : ''}`}
              onClick={onUndo}
              disabled={!canUndo}
              title={canUndo ? 'Undo file action (Ctrl+Z)' : 'Undo file action (Ctrl+Z) - nothing to undo'}
            >
              <Undo2 size={13} />
            </button>
          )}

          {onRedo && (
            <button
              className={`${styles.headerActionBtn} ${!canRedo ? styles.headerActionBtnDisabled : ''}`}
              onClick={onRedo}
              disabled={!canRedo}
              title={canRedo ? 'Redo file action (Ctrl+Y)' : 'Redo file action (Ctrl+Y) - nothing to redo'}
            >
              <Redo2 size={13} />
            </button>
          )}
        </div>

        <input
          id="workspace-folder-picker"
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

      {/* File Tree List */}
      <div className={styles.treeList}>
        {files.length === 0 && !creatingType ? (
          <div className={styles.emptyTree}>
            <p>Workspace is empty</p>
            <span>Click the New File or Folder icon above to start</span>
          </div>
        ) : (
          renderTree(files, 0, undefined)
        )}
      </div>
    </div>
  );
};
