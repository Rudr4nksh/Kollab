import React, { useState, useCallback, useEffect, useRef } from 'react';
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
  Upload,
  UploadCloud,
  FileCode,
  MessageSquare,
  Terminal,
  Sparkles
} from 'lucide-react';
import { FileExplorer } from '../../components/FileTree/FileExplorer.tsx';
import { TabBar } from '../../components/Tabs/TabBar.tsx';
import { CodeEditor } from '../../components/Editor/CodeEditor.tsx';
import { applyEditorTheme, THEMES_LIST } from '../../components/Editor/monacoTheme.ts';
import { ConsolePanel } from '../../components/Console/ConsolePanel.tsx';
import { ParticipantList } from '../../components/Participants/ParticipantList.tsx';
import { ActivityFeed } from '../../components/ActivityFeed/ActivityFeed.tsx';
import { AIAssistantPanel } from '../../components/AIAssistant/AIAssistantPanel.tsx';
import { AIDiffReviewModal } from '../../components/AIAssistant/AIDiffReviewModal.tsx';
import { RoomSettingsModal } from '../../components/RoomJoin/RoomSettingsModal.tsx';
import { LastPersonLeaveModal } from '../../components/UI/LastPersonLeaveModal.tsx';
import { KollabLogo } from '../../components/Brand/KollabLogo.tsx';
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
  VoiceParticipant,
  AIProposal
} from '../../types/index.ts';
import { 
  findFileByPath, 
  updateFileContentInTree, 
  getLanguageFromFilename,
  findFirstFileNode,
  renameNodeInTree,
  updateFileLanguageInTree,
  parseDroppedItems
} from '../../services/fileUtils.ts';
import { socketService } from '../../services/socket.ts';
import { copyToClipboard } from '../../services/clipboardUtils.ts';
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
  onAddToast?: (
    type: 'info' | 'success' | 'warning' | 'error',
    message: string,
    action?: { label: string; onClick: () => void }
  ) => void;
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
  onAddToast,
  onRecordActivity,
  messages = [],
  voiceUsers = [],
  onSendMessage,
}) => {
  // Activity bar active tool
  const [activeTool, setActiveTool] = useState<'files' | 'users' | 'activity'>('files');
  const [activeProposal, setActiveProposal] = useState<AIProposal | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const prevMessagesLength = React.useRef(messages?.length || 0);
  const [isCanvasDragOver, setIsCanvasDragOver] = useState(false);
  const canvasDragCounterRef = useRef(0);

  // Scalable panel dimensions with localStorage persistence
  const [aiWidth, setAiWidth] = useState<number>(() => {
    const saved = localStorage.getItem('kollab_ai_width');
    return saved ? Math.max(260, Math.min(600, parseInt(saved, 10))) : 320;
  });
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    const saved = localStorage.getItem('kollab_sidebar_width');
    return saved ? Math.max(180, Math.min(550, parseInt(saved, 10))) : 240;
  });
  const [chatWidth, setChatWidth] = useState<number>(() => {
    const saved = localStorage.getItem('kollab_chat_width');
    return saved ? Math.max(260, Math.min(600, parseInt(saved, 10))) : 320;
  });
  const [consoleHeight, setConsoleHeight] = useState<number>(() => {
    const saved = localStorage.getItem('kollab_console_height');
    return saved ? Math.max(120, Math.min(600, parseInt(saved, 10))) : 240;
  });

  const [isAiOpen, setIsAiOpen] = useState<boolean>(() => {
    const saved = localStorage.getItem('kollab_ai_open');
    return saved === 'true';
  });

  const [activeResizer, setActiveResizer] = useState<'ai' | 'sidebar' | 'chat' | 'console' | null>(null);

  // Editor theme state
  const [currentTheme, setCurrentTheme] = useState<string>(() => {
    return localStorage.getItem('kollab-editor-theme') || 'kollab-obsidian';
  });

  const handleWorkspaceThemeChange = (themeId: string) => {
    setCurrentTheme(themeId);
    localStorage.setItem('kollab-editor-theme', themeId);
    applyEditorTheme(themeId);
    document.documentElement.setAttribute('data-theme', themeId);
    document.body.setAttribute('data-theme', themeId);
    socketService.emitRoomThemeUpdate(roomId, themeId, userId);
  };

  // Sync room theme on mount and via socket from peers
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', currentTheme);
    document.body.setAttribute('data-theme', currentTheme);
    applyEditorTheme(currentTheme);

    const unsub = socketService.onRoomThemeChanged(({ themeId }) => {
      setCurrentTheme(themeId);
      localStorage.setItem('kollab-editor-theme', themeId);
      applyEditorTheme(themeId);
      document.documentElement.setAttribute('data-theme', themeId);
      document.body.setAttribute('data-theme', themeId);
      const thName = THEMES_LIST.find((t) => t.id === themeId)?.name || themeId;
      onAddToast?.('info', `Room theme set to ${thName}`);
    });

    return () => {
      unsub();
    };
  }, [roomId, onAddToast]);

  // Drag resizer handlers (VS Code sash style)
  const handleMouseDownAiResizer = (e: React.MouseEvent) => {
    e.preventDefault();
    setActiveResizer('ai');
    const startX = e.clientX;
    const startW = aiWidth;

    const onMouseMove = (ev: MouseEvent) => {
      const nextW = Math.max(260, Math.min(600, startW + (ev.clientX - startX)));
      setAiWidth(nextW);
    };

    const onMouseUp = (ev: MouseEvent) => {
      const nextW = Math.max(260, Math.min(600, startW + (ev.clientX - startX)));
      setAiWidth(nextW);
      localStorage.setItem('kollab_ai_width', String(nextW));
      setActiveResizer(null);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleMouseDownSidebarResizer = (e: React.MouseEvent) => {
    e.preventDefault();
    setActiveResizer('sidebar');
    const startX = e.clientX;
    const startW = sidebarWidth;

    const onMouseMove = (ev: MouseEvent) => {
      const nextW = Math.max(180, Math.min(550, startW + (ev.clientX - startX)));
      setSidebarWidth(nextW);
    };

    const onMouseUp = (ev: MouseEvent) => {
      const nextW = Math.max(180, Math.min(550, startW + (ev.clientX - startX)));
      setSidebarWidth(nextW);
      localStorage.setItem('kollab_sidebar_width', String(nextW));
      setActiveResizer(null);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleMouseDownChatResizer = (e: React.MouseEvent) => {
    e.preventDefault();
    setActiveResizer('chat');
    const startX = e.clientX;
    const startW = chatWidth;

    const onMouseMove = (ev: MouseEvent) => {
      const nextW = Math.max(260, Math.min(600, startW + (startX - ev.clientX)));
      setChatWidth(nextW);
    };

    const onMouseUp = (ev: MouseEvent) => {
      const nextW = Math.max(260, Math.min(600, startW + (startX - ev.clientX)));
      setChatWidth(nextW);
      localStorage.setItem('kollab_chat_width', String(nextW));
      setActiveResizer(null);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleMouseDownConsoleResizer = (e: React.MouseEvent) => {
    e.preventDefault();
    setActiveResizer('console');
    const startY = e.clientY;
    const startH = targetConsoleHeight;

    const onMouseMove = (ev: MouseEvent) => {
      const nextH = Math.max(120, Math.min(600, startH + (startY - ev.clientY)));
      setConsoleHeight(nextH);
      setIsConsoleMaximized(false);
    };

    const onMouseUp = (ev: MouseEvent) => {
      const nextH = Math.max(120, Math.min(600, startH + (startY - ev.clientY)));
      setConsoleHeight(nextH);
      localStorage.setItem('kollab_console_height', String(nextH));
      setActiveResizer(null);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const toggleAiPanel = () => {
    setIsAiOpen((prev) => {
      const next = !prev;
      localStorage.setItem('kollab_ai_open', String(next));
      return next;
    });
  };

  // Track unread messages when chat panel is closed
  useEffect(() => {
    if (!isChatOpen && messages && messages.length > prevMessagesLength.current) {
      setUnreadChatCount((prev) => prev + (messages.length - prevMessagesLength.current));
    }
    prevMessagesLength.current = messages?.length || 0;
  }, [messages, isChatOpen]);

  const [copiedRoom, setCopiedRoom] = useState(false);

  const handleCopyRoom = async () => {
    const success = await copyToClipboard(roomId);
    if (success) {
      setCopiedRoom(true);
      onAddToast?.('success', `Copied Room Code: ${roomId}`);
      setTimeout(() => setCopiedRoom(false), 2000);
    }
  };

  const [isLeaveConfirmOpen, setIsLeaveConfirmOpen] = useState(false);

  // If the user is the only person remaining in the room, warn them before leaving
  const handleAttemptLeave = () => {
    const otherParticipants = participants.filter((p) => p.id !== userId);
    if (otherParticipants.length === 0) {
      setIsLeaveConfirmOpen(true);
    } else {
      onLeaveRoom();
    }
  };

  // Warn on accidental tab close / page refresh if last person in the room
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const otherParticipants = participants.filter((p) => p.id !== userId);
      if (otherParticipants.length === 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [participants, userId]);

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
  const [isConsoleMaximized, setIsConsoleMaximized] = useState(false);
  const [consoleTab, setConsoleTab] = useState<'terminal' | 'problems' | 'preview'>('terminal');

  const targetConsoleHeight = isConsoleMaximized
    ? Math.max(380, consoleHeight + 140)
    : consoleHeight;

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

  const handleWorkspaceLanguageChange = (lang: SupportedLanguage, newFilename?: string) => {
    if (!activeFilePath) return;
    const { updatedNodes, newPath } = updateFileLanguageInTree(
      files,
      activeFilePath,
      lang,
      newFilename
    );
    onFilesChange(updatedNodes);
    if (newPath !== activeFilePath) {
      setActiveFilePath(newPath);
      setOpenFiles((prev) =>
        prev.map((f) =>
          f.path === activeFilePath
            ? { ...f, path: newPath, name: newFilename || f.name, language: lang }
            : f
        )
      );
    } else {
      setOpenFiles((prev) =>
        prev.map((f) =>
          f.path === activeFilePath ? { ...f, language: lang } : f
        )
      );
    }
    socketService.emitFilesTreeUpdate(
      roomId,
      updatedNodes,
      userId,
      `switched language to ${lang}`,
      'file_created'
    );
    onAddToast?.('info', `Language set to ${lang.toUpperCase()}${newFilename ? ` (${newFilename})` : ''}`);
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

  // Safe Multi-User AI Proposal Applicator
  const handleApplyProposal = (proposal: AIProposal) => {
    const targetPath = proposal.filePath;
    const updated = updateFileContentInTree(files, targetPath, proposal.proposedCode);
    onFilesChange(updated);
    setOpenFiles((prev) =>
      prev.map((f) => (f.path === targetPath ? { ...f, content: proposal.proposedCode } : f))
    );
    socketService.emitFileContentChange(roomId, targetPath, proposal.proposedCode, userId);
    setActiveProposal(null);

    if (onRecordActivity) {
      onRecordActivity('edit', `applied AI code proposal to ${targetPath}`);
    }
    socketService.emitChatMessage(
      roomId,
      userId,
      `✨ Applied AI code proposal to ${targetPath}`
    );
  };

  // --- File Undo / Redo History Support (Ctrl+Z / Ctrl+Y for File Operations) ---
  interface FileHistoryAction {
    type: 'create' | 'delete';
    node: FileNode;
    parentPath?: string;
    description: string;
  }

  const [fileUndoStack, setFileUndoStack] = useState<FileHistoryAction[]>([]);
  const [fileRedoStack, setFileRedoStack] = useState<FileHistoryAction[]>([]);

  const fileUndoStackRef = useRef<FileHistoryAction[]>([]);
  const fileRedoStackRef = useRef<FileHistoryAction[]>([]);
  const handleUndoFileActionRef = useRef<() => void>(() => {});
  const handleRedoFileActionRef = useRef<() => void>(() => {});

  const filesRef = useRef(files);
  filesRef.current = files;
  const openFilesRef = useRef(openFiles);
  openFilesRef.current = openFiles;
  const activeFilePathRef = useRef(activeFilePath);
  activeFilePathRef.current = activeFilePath;

  // Find a node and its parentPath in tree
  const findNodeAndParentInTree = (
    nodes: FileNode[],
    targetPath: string,
    parentPath?: string
  ): { node: FileNode; parentPath?: string } | null => {
    for (const n of nodes) {
      if (n.path === targetPath) {
        return { node: n, parentPath };
      }
      if (n.children) {
        const found = findNodeAndParentInTree(n.children, targetPath, n.path);
        if (found) return found;
      }
    }
    return null;
  };

  // Re-insert node into tree at parentPath
  const insertNodeIntoTree = (
    nodes: FileNode[],
    nodeToInsert: FileNode,
    parentPath?: string
  ): FileNode[] => {
    if (!parentPath) {
      if (nodes.some((n) => n.path === nodeToInsert.path)) return nodes;
      return [...nodes, nodeToInsert];
    }
    return nodes.map((n) => {
      if (n.path === parentPath) {
        const existing = n.children || [];
        if (existing.some((c) => c.path === nodeToInsert.path)) return n;
        return { ...n, children: [...existing, nodeToInsert] };
      }
      if (n.children) {
        return { ...n, children: insertNodeIntoTree(n.children, nodeToInsert, parentPath) };
      }
      return n;
    });
  };

  // Remove node by path from tree
  const removeNodeFromTree = (nodes: FileNode[], targetPath: string): FileNode[] => {
    return nodes
      .filter((n) => n.path !== targetPath)
      .map((n) => (n.children ? { ...n, children: removeNodeFromTree(n.children, targetPath) } : n));
  };

  const handleUndoFileAction = useCallback(() => {
    if (fileUndoStackRef.current.length === 0) return;
    const action = fileUndoStackRef.current[fileUndoStackRef.current.length - 1];
    const nextUndo = fileUndoStackRef.current.slice(0, -1);
    fileUndoStackRef.current = nextUndo;
    fileRedoStackRef.current = [...fileRedoStackRef.current, action];
    setFileUndoStack(nextUndo);
    setFileRedoStack(fileRedoStackRef.current);

    const currentFiles = filesRef.current;

    if (action.type === 'create') {
      const updated = removeNodeFromTree(currentFiles, action.node.path);
      onFilesChange(updated);
      socketService.emitFilesTreeUpdate(
        roomId,
        updated,
        userId,
        `undid create ${action.node.name}`,
        'file_deleted'
      );

      setOpenFiles((openPrev) => {
        const remaining = openPrev.filter(
          (f) => f.path !== action.node.path && !f.path.startsWith(action.node.path + '/')
        );
        if (
          activeFilePathRef.current === action.node.path ||
          activeFilePathRef.current.startsWith(action.node.path + '/')
        ) {
          if (remaining.length > 0) {
            setActiveFilePath(remaining[remaining.length - 1].path);
          } else {
            const first = findFirstFileNode(updated);
            setActiveFilePath(first ? first.path : '');
            if (first) return [first];
          }
        }
        return remaining;
      });

      onAddToast?.('info', `↩ Undid creation of "${action.node.name}"`, {
        label: 'Redo (Ctrl+Y)',
        onClick: () => handleRedoFileActionRef.current(),
      });
    } else if (action.type === 'delete') {
      const updated = insertNodeIntoTree(currentFiles, action.node, action.parentPath);
      onFilesChange(updated);
      socketService.emitFilesTreeUpdate(
        roomId,
        updated,
        userId,
        `restored ${action.node.name}`,
        'file_created'
      );

      if (action.node.type === 'file') {
        handleSelectFile(action.node);
      } else {
        const first = findFirstFileNode([action.node]);
        if (first) {
          handleSelectFile(first);
        }
      }

      onAddToast?.('success', `↩ Restored ${action.node.type} "${action.node.name}"`, {
        label: 'Redo (Ctrl+Y)',
        onClick: () => handleRedoFileActionRef.current(),
      });
    }
  }, [roomId, userId, onFilesChange, handleSelectFile, onAddToast]);

  const handleRedoFileAction = useCallback(() => {
    if (fileRedoStackRef.current.length === 0) return;
    const action = fileRedoStackRef.current[fileRedoStackRef.current.length - 1];
    const nextRedo = fileRedoStackRef.current.slice(0, -1);
    fileRedoStackRef.current = nextRedo;
    fileUndoStackRef.current = [...fileUndoStackRef.current, action];
    setFileRedoStack(nextRedo);
    setFileUndoStack(fileUndoStackRef.current);

    const currentFiles = filesRef.current;

    if (action.type === 'create') {
      const updated = insertNodeIntoTree(currentFiles, action.node, action.parentPath);
      onFilesChange(updated);
      socketService.emitFilesTreeUpdate(
        roomId,
        updated,
        userId,
        `re-created ${action.node.name}`,
        'file_created'
      );
      if (action.node.type === 'file') {
        handleSelectFile(action.node);
      }
      onAddToast?.('info', `↪ Re-created ${action.node.name}`, {
        label: 'Undo (Ctrl+Z)',
        onClick: () => handleUndoFileActionRef.current(),
      });
    } else if (action.type === 'delete') {
      const updated = removeNodeFromTree(currentFiles, action.node.path);
      onFilesChange(updated);
      socketService.emitFilesTreeUpdate(
        roomId,
        updated,
        userId,
        `re-deleted ${action.node.name}`,
        'file_deleted'
      );
      setOpenFiles((openPrev) => {
        const remaining = openPrev.filter(
          (f) => f.path !== action.node.path && !f.path.startsWith(action.node.path + '/')
        );
        if (
          activeFilePathRef.current === action.node.path ||
          activeFilePathRef.current.startsWith(action.node.path + '/')
        ) {
          if (remaining.length > 0) {
            setActiveFilePath(remaining[remaining.length - 1].path);
          } else {
            const first = findFirstFileNode(updated);
            setActiveFilePath(first ? first.path : '');
            if (first) return [first];
          }
        }
        return remaining;
      });
      onAddToast?.('info', `↪ Re-deleted ${action.node.name}`, {
        label: 'Undo (Ctrl+Z)',
        onClick: () => handleUndoFileActionRef.current(),
      });
    }
  }, [roomId, userId, onFilesChange, handleSelectFile, onAddToast]);

  handleUndoFileActionRef.current = handleUndoFileAction;
  handleRedoFileActionRef.current = handleRedoFileAction;

  // Global keydown listener for Ctrl+Z (Undo) and Ctrl+Y / Ctrl+Shift+Z (Redo)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrMeta = e.ctrlKey || e.metaKey;
      if (!isCtrlOrMeta) return;

      const target = e.target as HTMLElement | null;
      const activeEl = document.activeElement as HTMLElement | null;

      // 1. If inside Monaco editor (active element or event target), DO NOT intercept.
      // Monaco handles code undo and redo natively.
      const isInsideMonaco =
        Boolean(target?.closest('.monaco-editor')) ||
        Boolean(activeEl?.closest('.monaco-editor'));

      if (isInsideMonaco) {
        return;
      }

      // 2. If typing inside any text input or editable field outside Monaco,
      // allow native input undo/redo to function.
      const isInputOrTextarea =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        activeEl?.tagName === 'INPUT' ||
        activeEl?.tagName === 'TEXTAREA' ||
        Boolean(target?.isContentEditable) ||
        Boolean(activeEl?.isContentEditable);

      if (isInputOrTextarea) {
        return;
      }

      const key = e.key?.toLowerCase();
      const isZ = key === 'z' || e.code === 'KeyZ';
      const isY = key === 'y' || e.code === 'KeyY';

      // 3. Outside code editor and text inputs (e.g. explorer, tabs, canvas background),
      // perform file undo / redo operations:
      if (isZ && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        handleUndoFileActionRef.current();
      } else if ((isZ && e.shiftKey) || isY) {
        e.preventDefault();
        e.stopPropagation();
        handleRedoFileActionRef.current();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown, true);
    };
  }, []);

  const isFileDrag = (e: React.DragEvent) => {
    if (!e.dataTransfer) return false;
    const types = Array.from(e.dataTransfer.types || []);
    return types.includes('Files') || (e.dataTransfer.items && e.dataTransfer.items.length > 0);
  };

  const handleCanvasDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    canvasDragCounterRef.current++;
    if (isFileDrag(e)) {
      setIsCanvasDragOver(true);
    }
  };

  const handleCanvasDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
    if (!isCanvasDragOver && isFileDrag(e)) {
      setIsCanvasDragOver(true);
    }
  };

  const handleCanvasDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    canvasDragCounterRef.current--;
    if (canvasDragCounterRef.current <= 0) {
      canvasDragCounterRef.current = 0;
      setIsCanvasDragOver(false);
    }
  };

  const handleCanvasDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    canvasDragCounterRef.current = 0;
    setIsCanvasDragOver(false);
    if (e.dataTransfer) {
      try {
        const dropped = await parseDroppedItems(e.dataTransfer);
        if (dropped && dropped.length > 0) {
          const nextFiles = [...files, ...dropped];
          onFilesChange(nextFiles);
          socketService.emitFilesTreeUpdate(
            roomId,
            nextFiles,
            userId,
            'imported files from drag-and-drop',
            'folder_created'
          );
          const first = findFirstFileNode(dropped);
          if (first) handleSelectFile(first);
          onAddToast?.('success', `Imported ${dropped.length} item(s) from desktop`);
        }
      } catch (err) {
        console.error('Failed to import dropped items on canvas:', err);
      }
    }
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

    // Add to Undo History
    const snapshot: FileNode = JSON.parse(JSON.stringify(newFile));
    const actionItem: FileHistoryAction = {
      type: 'create',
      node: snapshot,
      parentPath,
      description: `created file ${name}`,
    };
    fileUndoStackRef.current = [...fileUndoStackRef.current, actionItem];
    fileRedoStackRef.current = [];
    setFileUndoStack(fileUndoStackRef.current);
    setFileRedoStack([]);
    onAddToast?.('success', `Created file "${name}"`, {
      label: 'Undo (Ctrl+Z)',
      onClick: () => handleUndoFileActionRef.current(),
    });
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

    // Add to Undo History
    const snapshot: FileNode = JSON.parse(JSON.stringify(newFolder));
    const actionItem: FileHistoryAction = {
      type: 'create',
      node: snapshot,
      parentPath,
      description: `created folder ${name}`,
    };
    fileUndoStackRef.current = [...fileUndoStackRef.current, actionItem];
    fileRedoStackRef.current = [];
    setFileUndoStack(fileUndoStackRef.current);
    setFileRedoStack([]);
    onAddToast?.('success', `Created folder "${name}"`, {
      label: 'Undo (Ctrl+Z)',
      onClick: () => handleUndoFileActionRef.current(),
    });
  };

  // Delete node (file or directory)
  const handleDeleteNode = (path: string) => {
    const targetPath = path.trim().replace(/\/+$/, '') || '/';
    const isTargetOrDescendant = (nodePath: string) => {
      const clean = nodePath.trim().replace(/\/+$/, '') || '/';
      return clean === targetPath || clean.startsWith(targetPath + '/');
    };

    // Save snapshot of node for undo before deleting
    const found = findNodeAndParentInTree(files, targetPath);
    if (found) {
      const snapshot: FileNode = JSON.parse(JSON.stringify(found.node));
      const actionItem: FileHistoryAction = {
        type: 'delete',
        node: snapshot,
        parentPath: found.parentPath,
        description: `deleted ${snapshot.type} ${snapshot.name}`,
      };
      fileUndoStackRef.current = [...fileUndoStackRef.current, actionItem];
      fileRedoStackRef.current = [];
      setFileUndoStack(fileUndoStackRef.current);
      setFileRedoStack([]);
      onAddToast?.('warning', `Deleted ${snapshot.type} "${snapshot.name}"`, {
        label: 'Undo (Ctrl+Z)',
        onClick: () => handleUndoFileActionRef.current(),
      });
    }

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

  // In-place Rename node (file or directory)
  const handleRenameNode = (oldPath: string, newName: string) => {
    const targetPath = oldPath.trim();
    if (!targetPath || !newName.trim()) return;

    const { updatedNodes, newPath } = renameNodeInTree(files, targetPath, newName.trim());
    onFilesChange(updatedNodes);

    // Update open tabs
    setOpenFiles((prev) =>
      prev.map((f) => {
        if (f.path === targetPath) {
          return {
            ...f,
            name: newName.trim(),
            path: newPath,
            language: getLanguageFromFilename(newName.trim()),
          };
        }
        if (f.path.startsWith(targetPath + '/')) {
          const childNewPath = newPath + f.path.slice(targetPath.length);
          return {
            ...f,
            path: childNewPath,
          };
        }
        return f;
      })
    );

    // Update activeFilePath
    if (activeFilePath === targetPath) {
      setActiveFilePath(newPath);
    } else if (activeFilePath.startsWith(targetPath + '/')) {
      setActiveFilePath(newPath + activeFilePath.slice(targetPath.length));
    }

    // Broadcast across peers
    socketService.emitFilesTreeUpdate(
      roomId,
      updatedNodes,
      userId,
      `renamed to ${newName.trim()}`,
      'file_created'
    );

    if (onRecordActivity) {
      onRecordActivity('edit', `renamed ${targetPath.split('/').pop()} to ${newName.trim()}`);
    }

    onAddToast?.('success', `Renamed to "${newName.trim()}"`);
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

    // Add to Undo History
    const snapshot: FileNode = JSON.parse(JSON.stringify(newFolder));
    const actionItem: FileHistoryAction = {
      type: 'create',
      node: snapshot,
      parentPath: undefined,
      description: `created project folder ${clean}`,
    };
    fileUndoStackRef.current = [...fileUndoStackRef.current, actionItem];
    fileRedoStackRef.current = [];
    setFileUndoStack(fileUndoStackRef.current);
    setFileRedoStack([]);
    onAddToast?.('success', `Created folder "${clean}"`, {
      label: 'Undo (Ctrl+Z)',
      onClick: () => handleUndoFileActionRef.current(),
    });
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
    <div className={styles.workspace} data-theme={currentTheme}>
      {/* Top Header Bar */}
      <header className={styles.topHeader}>
        <div className={styles.brandGroup}>
          <KollabLogo size={22} />

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
              className={`${styles.activityIcon} ${activeTool === 'files' && isSidebarOpen ? styles.activeActivity : ''}`}
              onClick={() => {
                if (activeTool === 'files' && isSidebarOpen) {
                  setIsSidebarOpen(false);
                } else {
                  setActiveTool('files');
                  setIsSidebarOpen(true);
                }
              }}
              title="File Explorer"
            >
              {activeTool === 'files' && isSidebarOpen && <span className={styles.activePill} />}
              <FolderTree size={16} />
            </div>

            <div
              className={`${styles.activityIcon} ${activeTool === 'users' && isSidebarOpen ? styles.activeActivity : ''}`}
              onClick={() => {
                if (activeTool === 'users' && isSidebarOpen) {
                  setIsSidebarOpen(false);
                } else {
                  setActiveTool('users');
                  setIsSidebarOpen(true);
                }
              }}
              title="Participants"
            >
              {activeTool === 'users' && isSidebarOpen && <span className={styles.activePill} />}
              <Users size={16} />
            </div>

            <div
              className={`${styles.activityIcon} ${activeTool === 'activity' && isSidebarOpen ? styles.activeActivity : ''}`}
              onClick={() => {
                if (activeTool === 'activity' && isSidebarOpen) {
                  setIsSidebarOpen(false);
                } else {
                  setActiveTool('activity');
                  setIsSidebarOpen(true);
                }
              }}
              title="Activity Feed"
            >
              {activeTool === 'activity' && isSidebarOpen && <span className={styles.activePill} />}
              <Activity size={16} />
            </div>

            <div
              className={`${styles.activityIcon} ${isAiOpen ? styles.activeActivity : ''}`}
              onClick={toggleAiPanel}
              title="AI Assistant (Claude / Gemini / Antigravity)"
            >
              {isAiOpen && <span className={styles.activePill} />}
              <Sparkles size={16} />
            </div>

            <div
              className={`${styles.activityIcon} ${consoleOpen ? styles.activeActivity : ''}`}
              onClick={() => setConsoleOpen(!consoleOpen)}
              title="Terminal (VS Code Shell)"
            >
              {consoleOpen && <span className={styles.activePill} />}
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
              onClick={handleAttemptLeave}
              title="Leave Workspace"
            >
              <LogOut size={16} />
            </div>
          </div>
        </nav>

        {/* 2. AI Assistant Panel (Smoothly pushes Explorer to the right when open) */}
        <aside
          className={styles.aiSidebar}
          style={{
            width: isAiOpen ? `${aiWidth}px` : '0px',
            overflow: 'hidden',
            opacity: isAiOpen ? 1 : 0,
            pointerEvents: isAiOpen ? 'auto' : 'none',
            borderRight: isAiOpen ? '1px solid rgba(255, 255, 255, 0.06)' : 'none',
            transition: activeResizer ? 'none' : 'width 300ms cubic-bezier(0.25, 1, 0.5, 1), opacity 220ms ease',
          }}
        >
          <div style={{ width: `${aiWidth}px`, minWidth: `${aiWidth}px`, height: '100%', overflow: 'hidden' }}>
            <AIAssistantPanel
              activeFile={activeFile}
              files={files}
              userName={displayName}
              onProposeCode={(prop) => setActiveProposal(prop)}
              onClose={() => {
                setIsAiOpen(false);
                localStorage.setItem('kollab_ai_open', 'false');
              }}
            />
          </div>
          {isAiOpen && (
            <div
              className={`${styles.colResizer} ${activeResizer === 'ai' ? styles.resizerActive : ''}`}
              onMouseDown={handleMouseDownAiResizer}
              title="Drag to resize AI Assistant"
            />
          )}
        </aside>

        {/* 3. Left Primary Sidebar (File Explorer or Selected Tool) */}
        <aside
          className={styles.leftSidebar}
          style={{
            width: isSidebarOpen ? `${sidebarWidth}px` : '0px',
            overflow: 'hidden',
            opacity: isSidebarOpen ? 1 : 0,
            pointerEvents: isSidebarOpen ? 'auto' : 'none',
            borderRight: isSidebarOpen ? '1px solid var(--border-subtle)' : 'none',
            transition: activeResizer ? 'none' : 'width 300ms cubic-bezier(0.25, 1, 0.5, 1), opacity 220ms ease',
          }}
        >
          <div style={{ width: `${sidebarWidth}px`, minWidth: `${sidebarWidth}px`, height: '100%', overflow: 'hidden' }}>
            {activeTool === 'files' && (
              <FileExplorer
                files={files}
                activeFilePath={activeFilePath}
                onSelectFile={handleSelectFile}
                onCreateFile={handleCreateFile}
                onCreateFolder={handleCreateFolder}
                onDeleteNode={handleDeleteNode}
                onRenameNode={handleRenameNode}
                canUndo={fileUndoStack.length > 0}
                canRedo={fileRedoStack.length > 0}
                onUndo={handleUndoFileAction}
                onRedo={handleRedoFileAction}
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
          </div>
          {isSidebarOpen && (
            <div
              className={`${styles.colResizer} ${activeResizer === 'sidebar' ? styles.resizerActive : ''}`}
              onMouseDown={handleMouseDownSidebarResizer}
              title="Drag to resize Explorer"
            />
          )}
        </aside>

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
            currentLanguage={activeFile ? ((activeFile.language || getLanguageFromFilename(activeFile.name)) as SupportedLanguage) : undefined}
            onLanguageChange={activeFile ? handleWorkspaceLanguageChange : undefined}
            currentTheme={currentTheme}
            onThemeChange={handleWorkspaceThemeChange}
          />

          <div 
            className={styles.editorArea}
            onDragEnter={handleCanvasDragEnter}
            onDragOver={handleCanvasDragOver}
            onDragLeave={handleCanvasDragLeave}
            onDrop={handleCanvasDrop}
          >
            {isCanvasDragOver && (
              <div className={styles.canvasDropOverlay}>
                <div className={styles.canvasDropCard}>
                  <div className={styles.canvasDropIconRing}>
                    <UploadCloud size={30} className={styles.canvasDropIcon} />
                  </div>
                  <div className={styles.canvasDropTextWrap}>
                    <h3 className={styles.canvasDropTitle}>Drop files or folders to import</h3>
                    <p className={styles.canvasDropSubtitle}>Add files directly into your workspace project</p>
                  </div>
                  <div className={styles.canvasDropBadge}>
                    <span>Release to import</span>
                  </div>
                </div>
              </div>
            )}

            {activeFile ? (
              <CodeEditor
                value={activeFile.content || ''}
                filePath={activeFilePath}
                language={(activeFile.language || getLanguageFromFilename(activeFile.name)) as SupportedLanguage}
                theme={currentTheme}
                onThemeChange={handleWorkspaceThemeChange}
                onLanguageChange={(lang, newFilename) => {
                  const { updatedNodes, newPath } = updateFileLanguageInTree(
                    files,
                    activeFilePath,
                    lang,
                    newFilename
                  );
                  onFilesChange(updatedNodes);
                  if (newPath !== activeFilePath) {
                    setActiveFilePath(newPath);
                    setOpenFiles((prev) =>
                      prev.map((f) =>
                        f.path === activeFilePath
                          ? { ...f, path: newPath, name: newFilename || f.name, language: lang }
                          : f
                      )
                    );
                  } else {
                    setOpenFiles((prev) =>
                      prev.map((f) =>
                        f.path === activeFilePath ? { ...f, language: lang } : f
                      )
                    );
                  }
                  socketService.emitFilesTreeUpdate(
                    roomId,
                    updatedNodes,
                    userId,
                    `switched language to ${lang}`,
                    'file_created'
                  );
                  onAddToast?.('info', `Language set to ${lang.toUpperCase()}${newFilename ? ` (${newFilename})` : ''}`);
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
                        ref={(el) => {
                          if (el) el.focus({ preventScroll: true });
                        }}
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
                      onClick={() => {
                        const input = document.getElementById('workspace-folder-picker') as HTMLInputElement;
                        input?.click();
                      }}
                    >
                      <Upload size={12} />
                      <span>Open Folder</span>
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
                    Select a file from the explorer on the left or enter a filename above.
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
                        ref={(el) => {
                          if (el) el.focus({ preventScroll: true });
                        }}
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

          {/* Bottom Console / Output Drawer */}
          <div
            className={styles.consoleDrawerWrapper}
            style={{
              height: consoleOpen ? `${targetConsoleHeight}px` : '0px',
              overflow: 'hidden',
              opacity: consoleOpen ? 1 : 0,
              pointerEvents: consoleOpen ? 'auto' : 'none',
              borderTop: consoleOpen ? '1px solid var(--border-subtle)' : 'none',
              transition: activeResizer ? 'none' : 'height 300ms cubic-bezier(0.25, 1, 0.5, 1), opacity 220ms ease',
            }}
          >
            {consoleOpen && (
              <div
                className={`${styles.rowResizer} ${activeResizer === 'console' ? styles.rowResizerActive : ''}`}
                onMouseDown={handleMouseDownConsoleResizer}
                title="Drag to resize Terminal"
              />
            )}

            <div style={{ height: `${targetConsoleHeight}px`, minHeight: `${targetConsoleHeight}px`, width: '100%', overflow: 'hidden' }}>
              <ConsolePanel
                logs={logs}
                onClearLogs={() => setLogs([])}
                onExecuteCommand={handleExecuteCommand}
                files={files}
                activeFileContent={activeFile?.content || ''}
                activeFilePath={activeFilePath}
                isOpen={consoleOpen}
                onToggleOpen={() => setConsoleOpen(!consoleOpen)}
                height={targetConsoleHeight}
                isMaximized={isConsoleMaximized}
                onToggleMaximize={() => setIsConsoleMaximized((prev) => !prev)}
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
            </div>
          </div>
        </main>

        {/* 4. Discord Chat & Voice Panel (Right Docked with Resizer) */}
        <div
          className={styles.chatSidebarWrapper}
          style={{
            width: isChatOpen ? `${chatWidth}px` : '0px',
            overflow: 'hidden',
            opacity: isChatOpen ? 1 : 0,
            pointerEvents: isChatOpen ? 'auto' : 'none',
            borderLeft: isChatOpen ? '1px solid rgba(255, 255, 255, 0.06)' : 'none',
            transition: activeResizer ? 'none' : 'width 300ms cubic-bezier(0.25, 1, 0.5, 1), opacity 220ms ease',
          }}
        >
          {isChatOpen && (
            <div
              className={`${styles.colResizerLeft} ${activeResizer === 'chat' ? styles.resizerActive : ''}`}
              onMouseDown={handleMouseDownChatResizer}
              title="Drag to resize Chat"
            />
          )}
          <div style={{ width: `${chatWidth}px`, minWidth: `${chatWidth}px`, height: '100%', overflow: 'hidden' }}>
            <DiscordPanel
              roomId={roomId}
              userId={userId}
              displayName={displayName}
              messages={messages}
              onSendMessage={onSendMessage || ((text) => socketService.emitChatMessage(roomId, userId, text))}
              voiceUsers={voiceUsers}
              participants={participants}
              onClose={() => setIsChatOpen(false)}
              width={chatWidth}
            />
          </div>
        </div>
      </div>

      {/* Invisible overlay while dragging to prevent Monaco or iframe event capture */}
      {activeResizer && (
        <div 
          className={styles.resizeOverlay} 
          style={{ cursor: activeResizer === 'console' ? 'row-resize' : 'col-resize' }} 
        />
      )}

      {/* Room Settings Dialog */}
      <RoomSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        roomId={roomId}
        isHost={isHost}
        hasPasscode={hasPasscode}
      />

      {/* Collision-Free AI Diff & Review Modal */}
      <AIDiffReviewModal
        proposal={activeProposal}
        onApply={handleApplyProposal}
        onDismiss={() => setActiveProposal(null)}
      />

      {/* Warning popup when last person attempts to leave */}
      <LastPersonLeaveModal
        isOpen={isLeaveConfirmOpen}
        roomId={roomId}
        onConfirmLeave={() => {
          setIsLeaveConfirmOpen(false);
          onLeaveRoom();
        }}
        onCancel={() => setIsLeaveConfirmOpen(false)}
      />

      <ToastContainer toasts={toasts} onDismiss={onDismissToast} />
    </div>
  );
};
