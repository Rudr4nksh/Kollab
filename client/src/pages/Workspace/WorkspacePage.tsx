import React, { useState, useCallback, useEffect } from 'react';
import { 
  FolderTree, 
  Users, 
  Activity, 
  Settings, 
  LogOut, 
  Share2, 
  Shield,
  Copy,
  Check,
  FolderPlus,
  Folder,
  FilePlus,
  Upload,
  FileCode,
  MessageSquare,
  Terminal
} from 'lucide-react';
import { FileExplorer } from '../../components/FileTree/FileExplorer.tsx';
import { TabBar } from '../../components/Tabs/TabBar.tsx';
import { CodeEditor } from '../../components/Editor/CodeEditor.tsx';
import { ConsolePanel } from '../../components/Console/ConsolePanel.tsx';
import { ParticipantList } from '../../components/Participants/ParticipantList.tsx';
import { ActivityFeed } from '../../components/ActivityFeed/ActivityFeed.tsx';
import { RoomSettingsModal } from '../../components/RoomJoin/RoomSettingsModal.tsx';
import { DiscordPanel } from '../../components/DiscordChat/DiscordPanel.tsx';
import { ToastContainer, ToastMessage } from '../../components/UI/Toast.tsx';
import type { 
  FileNode, 
  Participant, 
  ActivityEvent, 
  ConnectionState, 
  ConsoleLogItem,
  SupportedLanguage,
  ChatMessage,
  VoiceParticipant
} from '../../types/index.ts';
import { 
  findFileByPath, 
  updateFileContentInTree, 
  getLanguageFromFilename,
  findFirstFileNode
} from '../../services/fileUtils.ts';
import { socketService } from '../../services/socket.ts';
import styles from './WorkspacePage.module.css';

interface WorkspacePageProps {
  roomId: string;
  userId: string;
  displayName: string;
  isHost: boolean;
  hasPasscode?: boolean;
  connectionState: ConnectionState;
  participants: Participant[];
  setParticipants?: React.Dispatch<React.SetStateAction<Participant[]>>;
  activities: ActivityEvent[];
  files: FileNode[];
  onFilesChange: (files: FileNode[]) => void;
  onLeaveRoom: () => void;
  toasts: ToastMessage[];
  onDismissToast: (id: string) => void;
  onRecordActivity?: (type: string, details?: string) => void;
  messages?: ChatMessage[];
  voiceUsers?: VoiceParticipant[];
  onSendMessage?: (text: string) => void;
}

export const WorkspacePage: React.FC<WorkspacePageProps> = ({
  roomId,
  userId,
  displayName,
  isHost,
  hasPasscode,
  connectionState,
  participants,
  setParticipants,
  activities,
  files,
  onFilesChange,
  onLeaveRoom,
  toasts,
  onDismissToast,
  onRecordActivity,
  messages = [],
  voiceUsers = [],
  onSendMessage,
}) => {
  // Activity bar active tool
  const [activeTool, setActiveTool] = useState<'files' | 'users' | 'activity'>('files');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const prevMessagesLength = React.useRef(messages?.length || 0);

  // Track unread messages when chat panel is closed
  useEffect(() => {
    if (!isChatOpen && messages && messages.length > prevMessagesLength.current) {
      setUnreadChatCount((prev) => prev + (messages.length - prevMessagesLength.current));
    }
    prevMessagesLength.current = messages?.length || 0;
  }, [messages, isChatOpen]);

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
  const [newProjectName, setNewProjectName] = useState('');
  const [newDirectFileName, setNewDirectFileName] = useState('');

  // Console & execution state
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [consoleTab, setConsoleTab] = useState<'terminal' | 'problems' | 'preview'>('terminal');
  const [runTrigger, setRunTrigger] = useState<{ id: number; file: FileNode } | null>(null);
  const [stdinInput, setStdinInput] = useState('');
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

  // Auto-activate the first file when joining or when files arrive from socket
  useEffect(() => {
    if (files.length === 0) return;
    const currentActiveExists = activeFilePath && findFileByPath(files, activeFilePath);
    if (!currentActiveExists) {
      const firstFile = findFirstFileNode(files);
      if (firstFile) {
        setActiveFilePath(firstFile.path);
        setOpenFiles((prev) => {
          const valid = prev.filter((f) => !!findFileByPath(files, f.path));
          return valid.length > 0 ? valid : [firstFile];
        });
      }
    } else {
      // Keep open files updated with latest content from files tree
      setOpenFiles((prev) =>
        prev
          .map((f) => findFileByPath(files, f.path))
          .filter((f): f is FileNode => !!f)
      );
    }
  }, [files]);

  const handleLocalCursorChange = (line: number, column: number) => {
    if (setParticipants) {
      setParticipants((prev) =>
        prev.map((p) =>
          p.id === userId
            ? {
                ...p,
                cursor: { line, column },
                currentLine: line,
                activeFilePath,
              }
            : p
        )
      );
    }
    socketService.emitCursorMove(roomId, userId, activeFilePath, { line, column });
  };

  const handleLocalSelectionChange = (selection: {
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
  }) => {
    if (setParticipants) {
      setParticipants((prev) =>
        prev.map((p) =>
          p.id === userId
            ? {
                ...p,
                selection,
                activeFilePath,
              }
            : p
        )
      );
    }
    socketService.emitSelectionChange(roomId, userId, activeFilePath, selection);
  };

  // Editor content changes
  const handleContentChange = (newContent: string) => {
    const updated = updateFileContentInTree(files, activeFilePath, newContent);
    onFilesChange(updated);
    setOpenFiles((prev) =>
      prev.map((f) => (f.path === activeFilePath ? { ...f, content: newContent } : f))
    );
    socketService.emitFileContentChange(roomId, activeFilePath, newContent, userId);
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

    let nextFiles: FileNode[] = [];
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
      nextFiles = addToParent(files);
    } else {
      nextFiles = [...files, newFile];
    }

    onFilesChange(nextFiles);
    handleSelectFile(newFile);
    socketService.emitFilesTreeUpdate(roomId, nextFiles, userId, `created file ${name}`, 'file_created');
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

    let nextFiles: FileNode[] = [];
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
      nextFiles = addToParent(files);
    } else {
      nextFiles = [...files, newFolder];
    }

    onFilesChange(nextFiles);
    socketService.emitFilesTreeUpdate(roomId, nextFiles, userId, `created folder ${name}`, 'folder_created');
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
    socketService.emitFilesTreeUpdate(roomId, updatedFiles, userId, `deleted ${targetPath}`, 'file_deleted');

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

  // Helper to create root project folder (clean, empty folder without default files)
  const handleCreateProjectFolder = (folderName: string = 'project') => {
    const clean = folderName.trim().replace(/^\/+/, '') || 'project';
    const folderPath = `/${clean}`;
    const newFolder: FileNode = {
      id: 'folder_' + Math.random().toString(36).substring(2, 9),
      name: clean,
      path: folderPath,
      type: 'folder',
      isOpen: true,
      children: [],
    };

    const nextFiles = [...files, newFolder];
    onFilesChange(nextFiles);
    socketService.emitFilesTreeUpdate(roomId, nextFiles, userId, `created project folder ${clean}`, 'folder_created');
    if (onRecordActivity) {
      onRecordActivity('folder_created', `created folder ${clean}`);
    }
  };

  const handleCenterCreateFolderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = newProjectName.trim();
    if (!val) {
      handleCreateProjectFolder('project');
      return;
    }
    if (/\.[a-zA-Z0-9]+$/.test(val)) {
      handleCreateFile(val);
      setNewProjectName('');
    } else {
      handleCreateProjectFolder(val);
    }
  };

  const handleCenterCreateFileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newDirectFileName.trim();
    if (!name) return;
    handleCreateFile(name);
    setNewDirectFileName('');
  };

  // Run Code execution (Server compiler runner directly in Terminal or dedicated live HTML preview)
  const handleRunCode = useCallback(() => {
    if (!activeFile) return;

    const lang = activeFile.language || getLanguageFromFilename(activeFile.name);

    // If HTML or web file, open dedicated separate Live Preview tab
    if (lang === 'html' || activeFile.name.endsWith('.html') || activeFile.name.endsWith('.htm')) {
      setConsoleOpen(true);
      setConsoleTab('preview');
      return;
    }

    // For programming languages (C++, C, Python, JavaScript, Java, etc.): run directly in Terminal
    setConsoleOpen(true);
    setConsoleTab('terminal');
    setRunTrigger({ id: Date.now(), file: activeFile });
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
            className={`${styles.chatNavBtn} ${isChatOpen ? styles.chatNavBtnActive : ''}`}
            onClick={() => {
              setIsChatOpen(!isChatOpen);
              if (!isChatOpen) setUnreadChatCount(0);
            }}
            title={isChatOpen ? "Hide Chat & Voice" : "Open Chat & Voice"}
          >
            <MessageSquare size={13} />
            <span>Chat & Voice</span>
            {unreadChatCount > 0 && !isChatOpen && (
              <span className={styles.unreadBadge}>{unreadChatCount}</span>
            )}
          </button>

          <button
            className={styles.shareBtn}
            onClick={() => setIsSettingsOpen(true)}
            title="Room share & invite"
          >
            <Share2 size={12} />
            <span>Share Room ↗</span>
          </button>
        </div>
      </header>

      {/* Main 4-Column IDE Body */}
      <div className={styles.ideBody}>
        {/* 1. Left Activity Bar (with bottom settings and leave controls) */}
        <nav className={styles.activityBar}>
          <div className={styles.activityBarTop}>
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

            <div
              className={`${styles.activityIcon} ${consoleOpen ? styles.activeActivity : ''}`}
              onClick={() => setConsoleOpen(!consoleOpen)}
              title="Terminal (VS Code Shell)"
            >
              <Terminal size={16} />
            </div>
          </div>

          {/* Bottom Left Controls: Settings & Leave */}
          <div className={styles.activityBarBottom}>
            <div
              className={styles.activityIcon}
              onClick={() => setIsSettingsOpen(true)}
              title="Workspace Settings"
            >
              <Settings size={16} />
            </div>

            <div
              className={`${styles.activityIcon} ${styles.activityIconLeave}`}
              onClick={onLeaveRoom}
              title="Leave Workspace"
            >
              <LogOut size={16} />
            </div>
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
                onImportFolder={(imported) => {
                  onFilesChange(imported);
                  socketService.emitFilesTreeUpdate(roomId, imported, userId, 'imported folder from disk', 'folder_created');
                }}
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
                filePath={activeFilePath}
                language={(activeFile.language || getLanguageFromFilename(activeFile.name)) as SupportedLanguage}
                onLanguageChange={(lang) => {
                  const updated = files.map((f) =>
                    f.path === activeFilePath ? { ...f, language: lang } : f
                  );
                  onFilesChange(updated);
                  socketService.emitFilesTreeUpdate(roomId, updated, userId, `changed language to ${lang}`, 'file_created');
                }}
                onContentChange={handleContentChange}
                onCursorChange={handleLocalCursorChange}
                onSelectionChange={handleLocalSelectionChange}
                participants={participants}
                currentUserId={userId}
              />
            ) : files.length === 0 ? (
              <div className={styles.emptyEditorState}>
                <div className={styles.emptyCard}>
                  <div className={styles.emptyIconCircle}>
                    <FolderPlus size={24} className={styles.emptyFolderIcon} />
                  </div>
                  <h2 className={styles.emptyTitle}>create the project folder to start</h2>
                  <p className={styles.emptySubtitle}>
                    Enter a project name or open a local directory to begin collaborating.
                  </p>

                  <form onSubmit={handleCenterCreateFolderSubmit} className={styles.emptyForm}>
                    <div className={styles.unifiedInputPill}>
                      <Folder size={14} className={styles.inputFolderIcon} />
                      <input
                        type="text"
                        className={styles.emptyFolderInput}
                        placeholder="project-name or filename.ext"
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        autoFocus
                      />
                      <button type="submit" className={styles.createFolderInsideBtn}>
                        <span>Create</span>
                      </button>
                    </div>
                  </form>

                  <div className={styles.emptyQuickLinks}>
                    <button
                      type="button"
                      className={styles.ghostLinkBtn}
                      onClick={() => handleCreateFile('main.js')}
                    >
                      <FilePlus size={12} />
                      <span>Quick File (main.js)</span>
                    </button>
                    <span className={styles.linkDot}>•</span>
                    <button
                      type="button"
                      className={styles.ghostLinkBtn}
                      onClick={() => {
                        const input = document.getElementById('workspace-folder-picker') as HTMLInputElement;
                        input?.click();
                      }}
                    >
                      <Upload size={12} />
                      <span>Open Local Folder</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className={styles.emptyEditorState}>
                <div className={styles.emptyCard}>
                  <div className={styles.emptyIconCircle}>
                    <FileCode size={24} className={styles.emptyFileIcon} />
                  </div>
                  <h3 className={styles.emptyTitle}>No file open</h3>
                  <p className={styles.emptySubtitle}>
                    Select a file from the explorer on the left or create a new file.
                  </p>
                  <form onSubmit={handleCenterCreateFileSubmit} className={styles.emptyForm}>
                    <div className={styles.unifiedInputPill}>
                      <FileCode size={14} className={styles.inputFolderIcon} />
                      <input
                        type="text"
                        className={styles.emptyFolderInput}
                        placeholder="filename.ext (e.g. main.cpp, script.js)"
                        value={newDirectFileName}
                        onChange={(e) => setNewDirectFileName(e.target.value)}
                        autoFocus
                      />
                      <button type="submit" className={styles.createFolderInsideBtn}>
                        <span>Create</span>
                      </button>
                    </div>
                  </form>
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
            activeFilePath={activeFilePath}
            isOpen={consoleOpen}
            onToggleOpen={() => setConsoleOpen(!consoleOpen)}
            userName={displayName}
            roomId={roomId}
            activeTab={consoleTab}
            onTabChange={setConsoleTab}
            runTrigger={runTrigger}
            onRunningChange={setIsRunning}
            stdinInput={stdinInput}
            onStdinChange={setStdinInput}
            onCreateFile={handleCreateFile}
            onCreateFolder={handleCreateFolder}
            onDeleteNode={handleDeleteNode}
            onUpdateFileContent={handleContentChange}
            onFilesChange={(newFiles) => {
              onFilesChange(newFiles);
              socketService.emitFilesTreeUpdate(roomId, newFiles, userId, 'updated workspace files via git', 'file_created');
              if (newFiles.length > 0 && (!activeFilePath || !findFileByPath(newFiles, activeFilePath))) {
                const first = findFirstFileNode(newFiles);
                if (first) {
                  setActiveFilePath(first.path);
                  setOpenFiles([first]);
                }
              }
            }}
            onGitPush={(commitUrl, msg) => {
              if (onRecordActivity) {
                onRecordActivity('git_push', `${msg}: ${commitUrl}`);
              }
              socketService.emitChatMessage(roomId, userId, `🚀 Committed & pushed to GitHub: ${commitUrl}`);
            }}
          />
        </main>

        {/* 4. Discord Chat & Voice Panel (Right Docked) */}
        {isChatOpen && (
          <DiscordPanel
            roomId={roomId}
            userId={userId}
            displayName={displayName}
            messages={messages}
            onSendMessage={onSendMessage || ((text) => socketService.emitChatMessage(roomId, userId, text))}
            voiceUsers={voiceUsers}
            participants={participants}
            onClose={() => setIsChatOpen(false)}
          />
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
