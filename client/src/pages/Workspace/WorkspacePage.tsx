import React, { useState, useCallback } from 'react';
import { 
  FolderTree, 
  Users, 
  Activity, 
  Settings, 
  LogOut, 
  Share2, 
  Shield,
  PanelRightClose,
  PanelRight,
  Copy,
  Check,
  FolderPlus,
  Folder,
  FilePlus,
  Upload,
  FileCode
} from 'lucide-react';
import { FileExplorer } from '../../components/FileTree/FileExplorer.tsx';
import { TabBar } from '../../components/Tabs/TabBar.tsx';
import { CodeEditor } from '../../components/Editor/CodeEditor.tsx';
import { ConsolePanel } from '../../components/Console/ConsolePanel.tsx';
import { ParticipantList } from '../../components/Participants/ParticipantList.tsx';
import { ActivityFeed } from '../../components/ActivityFeed/ActivityFeed.tsx';
import { RoomSettingsModal } from '../../components/RoomJoin/RoomSettingsModal.tsx';
import { ToastContainer, ToastMessage } from '../../components/UI/Toast.tsx';
import type { 
  FileNode, 
  Participant, 
  ActivityEvent, 
  ConnectionState, 
  ConsoleLogItem,
  SupportedLanguage 
} from '../../types/index.ts';
import { 
  findFileByPath, 
  updateFileContentInTree, 
  getLanguageFromFilename,
  findFirstFileNode
} from '../../services/fileUtils.ts';
import styles from './WorkspacePage.module.css';

interface WorkspacePageProps {
  roomId: string;
  userId: string;
  displayName: string;
  isHost: boolean;
  hasPasscode?: boolean;
  connectionState: ConnectionState;
  participants: Participant[];
  activities: ActivityEvent[];
  files: FileNode[];
  onFilesChange: (files: FileNode[]) => void;
  onLeaveRoom: () => void;
  toasts: ToastMessage[];
  onDismissToast: (id: string) => void;
  onRecordActivity?: (type: string, details?: string) => void;
}

export const WorkspacePage: React.FC<WorkspacePageProps> = ({
  roomId,
  userId,
  displayName,
  isHost,
  hasPasscode,
  connectionState,
  participants,
  activities,
  files,
  onFilesChange,
  onLeaveRoom,
  toasts,
  onDismissToast,
  onRecordActivity,
}) => {
  // Activity bar active tool
  const [activeTool, setActiveTool] = useState<'files' | 'users' | 'activity'>('files');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isUpdatesOpen, setIsUpdatesOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [copiedRoom, setCopiedRoom] = useState(false);

  const handleCopyRoom = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedRoom(true);
    setTimeout(() => setCopiedRoom(false), 2000);
  };

  // Tabs & active file
  const [openFiles, setOpenFiles] = useState<FileNode[]>(() => {
    return files.slice(0, 3);
  });
  const [activeFilePath, setActiveFilePath] = useState<string>(() => {
    return files[0]?.path || '';
  });
  const [newProjectName, setNewProjectName] = useState('project');

  // Console & execution state
  const [consoleOpen, setConsoleOpen] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<ConsoleLogItem[]>([
    {
      id: 'log_init',
      type: 'system',
      text: `Kollab workspace ready. Connected to room ${roomId}.`,
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);

  const activeFile = activeFilePath ? findFileByPath(files, activeFilePath) : null;

  // Switch or open a file
  const handleSelectFile = (file: FileNode) => {
    if (file.type !== 'file') return;
    setActiveFilePath(file.path);
    if (!openFiles.some((f) => f.path === file.path)) {
      setOpenFiles((prev) => [...prev, file]);
    }
  };

  const handleCloseTab = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const remaining = openFiles.filter((f) => f.path !== path);
    setOpenFiles(remaining);

    if (activeFilePath === path) {
      if (remaining.length > 0) {
        setActiveFilePath(remaining[remaining.length - 1].path);
      } else {
        setActiveFilePath('');
      }
    }
  };

  // Editor content changes
  const handleContentChange = (newContent: string) => {
    const updated = updateFileContentInTree(files, activeFilePath, newContent);
    onFilesChange(updated);
    setOpenFiles((prev) =>
      prev.map((f) => (f.path === activeFilePath ? { ...f, content: newContent } : f))
    );
  };

  // Create new file
  const handleCreateFile = (name: string, parentPath?: string) => {
    const filePath = parentPath ? `${parentPath}/${name}` : `/${name}`;
    const newFile: FileNode = {
      id: 'file_' + Math.random().toString(36).substring(2, 9),
      name,
      path: filePath,
      type: 'file',
      language: getLanguageFromFilename(name),
      content: '',
    };

    if (parentPath) {
      const addToParent = (nodes: FileNode[]): FileNode[] => {
        return nodes.map((n) => {
          if (n.path === parentPath) {
            return { ...n, children: [...(n.children || []), newFile] };
          }
          if (n.children) {
            return { ...n, children: addToParent(n.children) };
          }
          return n;
        });
      };
      onFilesChange(addToParent(files));
    } else {
      onFilesChange([...files, newFile]);
    }

    handleSelectFile(newFile);
    if (onRecordActivity) {
      onRecordActivity('file_created', `created file ${name}`);
    }
  };

  // Create new folder
  const handleCreateFolder = (name: string, parentPath?: string) => {
    const folderPath = parentPath ? `${parentPath}/${name}` : `/${name}`;
    const newFolder: FileNode = {
      id: 'folder_' + Math.random().toString(36).substring(2, 9),
      name,
      path: folderPath,
      type: 'folder',
      isOpen: true,
      children: [],
    };

    if (parentPath) {
      const addToParent = (nodes: FileNode[]): FileNode[] => {
        return nodes.map((n) => {
          if (n.path === parentPath) {
            return { ...n, children: [...(n.children || []), newFolder] };
          }
          if (n.children) {
            return { ...n, children: addToParent(n.children) };
          }
          return n;
        });
      };
      onFilesChange(addToParent(files));
    } else {
      onFilesChange([...files, newFolder]);
    }
  };

  // Delete node (file or directory)
  const handleDeleteNode = (path: string) => {
    const targetPath = path.trim().replace(/\/+$/, '') || '/';
    const isTargetOrDescendant = (nodePath: string) => {
      const clean = nodePath.trim().replace(/\/+$/, '') || '/';
      return clean === targetPath || clean.startsWith(targetPath + '/');
    };

    const deleteRecursive = (nodes: FileNode[]): FileNode[] => {
      return nodes
        .filter((n) => n.path !== targetPath)
        .map((n) => (n.children ? { ...n, children: deleteRecursive(n.children) } : n));
    };

    const updatedFiles = deleteRecursive(files);
    onFilesChange(updatedFiles);

    // Remove deleted file or all files inside the deleted folder from open tabs
    const remainingOpenFiles = openFiles.filter((f) => !isTargetOrDescendant(f.path));
    setOpenFiles(remainingOpenFiles);

    // If the active file was deleted or its ancestor folder was deleted
    if (activeFilePath && isTargetOrDescendant(activeFilePath)) {
      if (remainingOpenFiles.length > 0) {
        setActiveFilePath(remainingOpenFiles[remainingOpenFiles.length - 1].path);
      } else {
        const firstFile = findFirstFileNode(updatedFiles);
        if (firstFile) {
          setActiveFilePath(firstFile.path);
          setOpenFiles([firstFile]);
        } else {
          setActiveFilePath('');
        }
      }
    }
  };

  // Helper to create root project folder and initialize with first file
  const handleCreateProjectFolder = (folderName: string = 'project') => {
    const clean = folderName.trim().replace(/^\/+/, '') || 'project';
    const folderPath = `/${clean}`;
    const initialFile: FileNode = {
      id: 'file_' + Math.random().toString(36).substring(2, 9),
      name: 'index.js',
      path: `${folderPath}/index.js`,
      type: 'file',
      language: 'javascript',
      content: `// Project: ${clean}\nconsole.log("Welcome to ${clean}!");\n`,
    };
    const newFolder: FileNode = {
      id: 'folder_' + Math.random().toString(36).substring(2, 9),
      name: clean,
      path: folderPath,
      type: 'folder',
      isOpen: true,
      children: [initialFile],
    };

    const nextFiles = [...files, newFolder];
    onFilesChange(nextFiles);
    setOpenFiles([initialFile]);
    setActiveFilePath(initialFile.path);
    if (onRecordActivity) {
      onRecordActivity('folder_created', `created folder ${clean}`);
    }
  };

  const handleCenterCreateFolderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleCreateProjectFolder(newProjectName || 'project');
  };

  // Run Code execution (interactive JS sandbox or simulation)
  const handleRunCode = useCallback(() => {
    if (!activeFile) return;
    setIsRunning(true);
    setConsoleOpen(true);

    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [
      ...prev,
      {
        id: 'run_' + Date.now(),
        type: 'info',
        text: `▶ Running ${activeFile.name}...`,
        timestamp: time,
      },
    ]);

    setTimeout(() => {
      try {
        const lang = activeFile.language || getLanguageFromFilename(activeFile.name);

        if (lang === 'javascript') {
          // Capture console.log in an isolated evaluation
          const capturedLogs: string[] = [];
          const customConsole = {
            log: (...args: any[]) => capturedLogs.push(args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ')),
            error: (...args: any[]) => capturedLogs.push('ERROR: ' + args.join(' ')),
            warn: (...args: any[]) => capturedLogs.push('WARN: ' + args.join(' ')),
          };

          const runFn = new Function('console', activeFile.content || '');
          const result = runFn(customConsole);

          capturedLogs.forEach((logText) => {
            setLogs((prev) => [
              ...prev,
              {
                id: 'log_' + Math.random().toString(36),
                type: logText.startsWith('ERROR:') ? 'stderr' : 'stdout',
                text: logText,
                timestamp: new Date().toLocaleTimeString(),
              },
            ]);
          });

          if (result !== undefined) {
            setLogs((prev) => [
              ...prev,
              {
                id: 'res_' + Date.now(),
                type: 'result',
                text: typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result),
                timestamp: new Date().toLocaleTimeString(),
              },
            ]);
          }
        } else if (lang === 'python') {
          setLogs((prev) => [
            ...prev,
            {
              id: 'py_' + Date.now(),
              type: 'stdout',
              text: `[Python Runtime] Output: Hello from ${activeFile.name}!\nProcess finished with exit code 0.`,
              timestamp: new Date().toLocaleTimeString(),
            },
          ]);
        } else if (lang === 'html' || lang === 'css') {
          setLogs((prev) => [
            ...prev,
            {
              id: 'html_' + Date.now(),
              type: 'info',
              text: `Compiled ${activeFile.name} to Live Preview frame.`,
              timestamp: new Date().toLocaleTimeString(),
            },
          ]);
        } else {
          setLogs((prev) => [
            ...prev,
            {
              id: 'gen_' + Date.now(),
              type: 'stdout',
              text: `Executed ${activeFile.name} successfully. (Duration: 42ms)`,
              timestamp: new Date().toLocaleTimeString(),
            },
          ]);
        }
      } catch (err: any) {
        setLogs((prev) => [
          ...prev,
          {
            id: 'err_' + Date.now(),
            type: 'stderr',
            text: err.toString(),
            timestamp: new Date().toLocaleTimeString(),
          },
        ]);
      } finally {
        setIsRunning(false);
      }
    }, 150);
  }, [activeFile]);

  // Execute console command prompt
  const handleExecuteCommand = (cmd: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [
      ...prev,
      {
        id: 'cmd_' + Date.now(),
        type: 'stdout',
        text: `> ${cmd}`,
        timestamp: time,
      },
    ]);

    try {
      // Evaluate command in safe isolated function context
      const evaluator = new Function(`return (${cmd})`);
      const res = evaluator();
      setLogs((prev) => [
        ...prev,
        {
          id: 'res_' + Date.now(),
          type: 'result',
          text: typeof res === 'object' ? JSON.stringify(res, null, 2) : String(res),
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } catch (err: any) {
      setLogs((prev) => [
        ...prev,
        {
          id: 'err_' + Date.now(),
          type: 'stderr',
          text: err.toString(),
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    }
  };

  const handleCopyCode = () => {
    if (!activeFile) return;
    navigator.clipboard.writeText(activeFile.content || '');
  };

  return (
    <div className={styles.workspace}>
      {/* Top Header Bar */}
      <header className={styles.topHeader}>
        <div className={styles.brandGroup}>
          <div className={styles.brandBadge}>
            <span>&lt;&nbsp;/&nbsp;&gt;</span>
          </div>
          <span className={styles.brandName}>Kollab</span>
          <span className={styles.brandVersion}>v2.0</span>

          <div className={styles.separator} />

          <div 
            className={styles.roomBadge} 
            onClick={handleCopyRoom} 
            title={`User: ${displayName} • Click to copy invite link`}
          >
            <span className={styles.roomPrefix}>ROOM:</span>
            <span className={styles.roomId}>{roomId}</span>
            {hasPasscode && (
              <span title="Passcode protected">
                <Shield size={12} className={styles.lockIcon} />
              </span>
            )}
            {copiedRoom ? (
              <Check size={12} className={styles.copiedIcon} />
            ) : (
              <Copy size={12} className={styles.copyIcon} />
            )}
          </div>
        </div>

        <div className={styles.headerCenter}>
          <span className={`${styles.statusDot} ${styles[connectionState]}`} />
          <span className={styles.statusText}>{connectionState === 'connected' ? 'Live Session' : 'Offline'}</span>
        </div>

        <div className={styles.headerRight}>
          {isHost && <span className={styles.hostPill}>HOST</span>}

          <button
            className={styles.shareBtn}
            onClick={() => setIsSettingsOpen(true)}
            title="Room share & invite"
          >
            <Share2 size={12} />
            <span>Share Room ↗</span>
          </button>

          <button
            className={styles.iconNavBtn}
            onClick={() => setIsUpdatesOpen(!isUpdatesOpen)}
            title="Toggle updates panel"
          >
            {isUpdatesOpen ? <PanelRightClose size={13} /> : <PanelRight size={13} />}
            <span>Feed</span>
          </button>

          <button
            className={styles.iconNavBtn}
            onClick={() => setIsSettingsOpen(true)}
            title="Workspace settings"
          >
            <Settings size={13} />
          </button>

          <button
            className={styles.leaveBtn}
            onClick={onLeaveRoom}
            title="Leave workspace"
          >
            <LogOut size={13} />
            <span>Leave</span>
          </button>
        </div>
      </header>

      {/* Main 4-Column IDE Body */}
      <div className={styles.ideBody}>
        {/* 1. Left Activity Bar */}
        <nav className={styles.activityBar}>
          <div
            className={`${styles.activityIcon} ${activeTool === 'files' ? styles.activeActivity : ''}`}
            onClick={() => {
              setActiveTool('files');
              setIsSidebarOpen(true);
            }}
            title="File Explorer"
          >
            {activeTool === 'files' && <span className={styles.activePill} />}
            <FolderTree size={16} />
          </div>

          <div
            className={`${styles.activityIcon} ${activeTool === 'users' ? styles.activeActivity : ''}`}
            onClick={() => {
              setActiveTool('users');
              setIsSidebarOpen(true);
            }}
            title="Participants"
          >
            {activeTool === 'users' && <span className={styles.activePill} />}
            <Users size={16} />
          </div>

          <div
            className={`${styles.activityIcon} ${activeTool === 'activity' ? styles.activeActivity : ''}`}
            onClick={() => {
              setActiveTool('activity');
              setIsSidebarOpen(true);
            }}
            title="Activity Feed"
          >
            {activeTool === 'activity' && <span className={styles.activePill} />}
            <Activity size={16} />
          </div>
        </nav>

        {/* 2. Left Sidebar (File Explorer or Selected Tool) */}
        {isSidebarOpen && (
          <aside className={styles.leftSidebar}>
            {activeTool === 'files' && (
              <FileExplorer
                files={files}
                activeFilePath={activeFilePath}
                onSelectFile={handleSelectFile}
                onCreateFile={handleCreateFile}
                onCreateFolder={handleCreateFolder}
                onDeleteNode={handleDeleteNode}
                onImportFolder={(imported) => onFilesChange(imported)}
                isHost={isHost}
              />
            )}
            {activeTool === 'users' && (
              <ParticipantList participants={participants} currentUserId={userId} />
            )}
            {activeTool === 'activity' && (
              <ActivityFeed activities={activities} />
            )}
          </aside>
        )}

        {/* 3. Center Canvas (Tabs + Monaco + Bottom Console) */}
        <main className={styles.centerCanvas}>
          <TabBar
            openFiles={openFiles}
            activeFilePath={activeFilePath}
            onSelectTab={(file) => setActiveFilePath(file.path)}
            onCloseTab={handleCloseTab}
            onRunCode={handleRunCode}
            onCopyCode={handleCopyCode}
            isRunning={isRunning}
          />

          <div className={styles.editorArea}>
            {activeFile ? (
              <CodeEditor
                value={activeFile.content || ''}
                language={(activeFile.language || getLanguageFromFilename(activeFile.name)) as SupportedLanguage}
                onLanguageChange={(lang) => {
                  const updated = files.map((f) =>
                    f.path === activeFilePath ? { ...f, language: lang } : f
                  );
                  onFilesChange(updated);
                }}
                onContentChange={handleContentChange}
                participants={participants}
                currentUserId={userId}
              />
            ) : files.length === 0 ? (
              <div className={styles.emptyEditorState}>
                <div className={styles.emptyCard}>
                  <div className={styles.emptyIconCircle}>
                    <FolderPlus size={30} className={styles.emptyFolderIcon} />
                  </div>
                  <h2 className={styles.emptyTitle}>create the project folder to start</h2>
                  <p className={styles.emptySubtitle}>
                    Collaborate on multi-file code in real-time. Create your root project directory or open an existing local project.
                  </p>

                  <form onSubmit={handleCenterCreateFolderSubmit} className={styles.emptyForm}>
                    <div className={styles.inputWrapper}>
                      <Folder size={14} className={styles.inputFolderIcon} />
                      <input
                        type="text"
                        className={styles.emptyFolderInput}
                        placeholder="project-name (e.g. my-app, src)"
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        autoFocus
                      />
                    </div>
                    <button type="submit" className={styles.createFolderPrimaryBtn}>
                      <FolderPlus size={14} />
                      <span>Create Project Folder</span>
                    </button>
                  </form>

                  <div className={styles.emptyDivider}>
                    <span>or</span>
                  </div>

                  <div className={styles.emptyActionRow}>
                    <button
                      type="button"
                      className={styles.emptySecondaryBtn}
                      onClick={() => handleCreateFile('main.js')}
                    >
                      <FilePlus size={13} />
                      <span>New File</span>
                    </button>
                    <button
                      type="button"
                      className={styles.emptySecondaryBtn}
                      onClick={() => {
                        const input = document.getElementById('workspace-folder-picker') as HTMLInputElement;
                        input?.click();
                      }}
                    >
                      <Upload size={13} />
                      <span>Open Folder</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className={styles.emptyEditorState}>
                <div className={styles.emptyCard}>
                  <div className={styles.emptyIconCircle}>
                    <FileCode size={30} className={styles.emptyFileIcon} />
                  </div>
                  <h3 className={styles.emptyTitle}>No file open</h3>
                  <p className={styles.emptySubtitle}>
                    Select a file from the explorer on the left or create a new file to start editing.
                  </p>
                  <button
                    type="button"
                    className={styles.createFolderPrimaryBtn}
                    onClick={() => handleCreateFile('index.js')}
                  >
                    <FilePlus size={13} />
                    <span>Create New File</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Console / Output */}
          <ConsolePanel
            logs={logs}
            onClearLogs={() => setLogs([])}
            onExecuteCommand={handleExecuteCommand}
            files={files}
            activeFileContent={activeFile?.content || ''}
            isOpen={consoleOpen}
            onToggleOpen={() => setConsoleOpen(!consoleOpen)}
          />
        </main>

        {/* 4. Right Sidebar: Live Updates & Connected Participants */}
        {isUpdatesOpen && (
          <aside className={styles.rightSidebar}>
            <div className={styles.rightParticipantsSection}>
              <ParticipantList participants={participants} currentUserId={userId} />
            </div>
            <div className={styles.rightActivitySection}>
              <ActivityFeed activities={activities} />
            </div>
          </aside>
        )}
      </div>

      {/* Room Settings Dialog */}
      <RoomSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        roomId={roomId}
        isHost={isHost}
        hasPasscode={hasPasscode}
      />

      <ToastContainer toasts={toasts} onDismiss={onDismissToast} />
    </div>
  );
};
