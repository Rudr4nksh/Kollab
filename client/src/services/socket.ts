import { io, Socket } from 'socket.io-client';
import type { 
  Participant, 
  FileNode, 
  ActivityEvent, 
  UserRole,
  CursorPosition,
  SelectionRange,
  ConnectionState,
  ChatMessage,
  VoiceParticipant
} from '../types/index.ts';

class SocketService {
  private socket: Socket | null = null;
  private currentRoomId: string | null = null;
  private connectionStateListeners: ((state: ConnectionState) => void)[] = [];

  public init(): Socket {
    if (this.socket) return this.socket;

    // Connect to current origin, Vite proxies /socket.io to server port 4000
    this.socket = io({
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      autoConnect: true,
    });

    this.socket.on('connect', () => {
      this.notifyConnectionState('connected');
    });

    this.socket.on('disconnect', () => {
      this.notifyConnectionState('offline');
    });

    this.socket.on('connect_error', () => {
      this.notifyConnectionState('offline');
    });

    this.socket.on('reconnecting', () => {
      this.notifyConnectionState('reconnecting');
    });

    return this.socket;
  }

  public getSocket(): Socket {
    return this.socket || this.init();
  }

  public onConnectionStateChange(listener: (state: ConnectionState) => void): () => void {
    this.connectionStateListeners.push(listener);
    // Emit immediate current state
    if (this.socket?.connected) {
      listener('connected');
    }
    return () => {
      this.connectionStateListeners = this.connectionStateListeners.filter((l) => l !== listener);
    };
  }

  private notifyConnectionState(state: ConnectionState) {
    this.connectionStateListeners.forEach((l) => l(state));
  }

  public joinRoom(payload: {
    roomId: string;
    userId: string;
    displayName: string;
    role?: UserRole;
  }) {
    const s = this.getSocket();
    this.currentRoomId = payload.roomId;
    s.emit('join-room', payload);
  }

  public leaveRoom() {
    if (this.socket && this.currentRoomId) {
      this.socket.emit('leave-room');
      this.currentRoomId = null;
    }
  }

  public emitFileContentChange(roomId: string, filePath: string, content: string, userId: string) {
    const s = this.getSocket();
    s.emit('file-content-change', { roomId, filePath, content, userId });
  }

  public emitFilesTreeUpdate(
    roomId: string,
    files: FileNode[],
    userId: string,
    actionDetails?: string,
    actionType?: 'file_created' | 'file_deleted' | 'folder_created'
  ) {
    const s = this.getSocket();
    s.emit('files-tree-update', { roomId, files, userId, actionDetails, actionType });
  }

  public emitCursorMove(
    roomId: string,
    userId: string,
    filePath: string,
    cursor: CursorPosition
  ) {
    const s = this.getSocket();
    s.emit('cursor-move', { roomId, userId, filePath, cursor });
  }

  public emitSelectionChange(
    roomId: string,
    userId: string,
    filePath: string,
    selection: SelectionRange
  ) {
    const s = this.getSocket();
    s.emit('selection-change', { roomId, userId, filePath, selection });
  }

  public emitChatMessage(roomId: string, userId: string, text: string) {
    const s = this.getSocket();
    s.emit('chat-message', { roomId, userId, text });
  }

  public onChatMessage(callback: (message: ChatMessage) => void): () => void {
    const s = this.getSocket();
    s.on('chat-message', callback);
    return () => {
      s.off('chat-message', callback);
    };
  }

  public emitVoiceJoin(roomId: string, userId: string) {
    const s = this.getSocket();
    s.emit('voice-join', { roomId, userId });
  }

  public emitVoiceLeave(roomId: string, userId: string) {
    const s = this.getSocket();
    s.emit('voice-leave', { roomId, userId });
  }

  public emitVoiceSignal(roomId: string, targetUserId: string, fromUserId: string, signal: any) {
    const s = this.getSocket();
    s.emit('voice-signal', { roomId, targetUserId, fromUserId, signal });
  }

  public onVoiceSignal(
    callback: (data: { fromUserId: string; fromSocketId: string; signal: any }) => void
  ): () => void {
    const s = this.getSocket();
    s.on('voice-signal', callback);
    return () => {
      s.off('voice-signal', callback);
    };
  }

  public emitVoiceState(
    roomId: string,
    userId: string,
    state: { isMuted?: boolean; isDeafened?: boolean; isSpeaking?: boolean }
  ) {
    const s = this.getSocket();
    s.emit('voice-state', { roomId, userId, ...state });
  }

  public onVoiceUsersUpdated(callback: (users: VoiceParticipant[]) => void): () => void {
    const s = this.getSocket();
    s.on('voice-users-updated', callback);
    return () => {
      s.off('voice-users-updated', callback);
    };
  }

  public onRoomJoined(callback: (data: {
    participants: Participant[];
    voiceUsers?: VoiceParticipant[];
    messages?: ChatMessage[];
    files: FileNode[];
    yourParticipant: Participant;
  }) => void): () => void {
    const s = this.getSocket();
    s.on('room-joined', callback);
    return () => {
      s.off('room-joined', callback);
    };
  }

  public onParticipantsUpdated(callback: (participants: Participant[]) => void): () => void {
    const s = this.getSocket();
    s.on('participants-updated', callback);
    return () => {
      s.off('participants-updated', callback);
    };
  }

  public onFileContentUpdate(callback: (data: {
    filePath: string;
    content: string;
    userId: string;
  }) => void): () => void {
    const s = this.getSocket();
    s.on('file-content-update', callback);
    return () => {
      s.off('file-content-update', callback);
    };
  }

  public onFilesTreeUpdate(callback: (data: {
    files: FileNode[];
    userId: string;
  }) => void): () => void {
    const s = this.getSocket();
    s.on('files-tree-update', callback);
    return () => {
      s.off('files-tree-update', callback);
    };
  }

  public onPeerCursor(callback: (data: {
    userId: string;
    filePath: string;
    cursor: CursorPosition;
    line: number;
  }) => void): () => void {
    const s = this.getSocket();
    s.on('peer-cursor', callback);
    return () => {
      s.off('peer-cursor', callback);
    };
  }

  public onPeerSelection(callback: (data: {
    userId: string;
    filePath: string;
    selection: SelectionRange;
  }) => void): () => void {
    const s = this.getSocket();
    s.on('peer-selection', callback);
    return () => {
      s.off('peer-selection', callback);
    };
  }

  public onActivityEvent(callback: (activity: ActivityEvent) => void): () => void {
    const s = this.getSocket();
    s.on('activity-event', callback);
    return () => {
      s.off('activity-event', callback);
    };
  }

  // --- Interactive Terminal Runner ---
  public emitTerminalRun(payload: {
    language: string;
    code: string;
    filename?: string;
    initialInput?: string;
  }) {
    this.getSocket().emit('terminal:run_code', payload);
  }

  public emitTerminalStdin(text: string) {
    this.getSocket().emit('terminal:stdin', { text });
  }

  public emitTerminalStdinEOF() {
    this.getSocket().emit('terminal:stdin_eof');
  }

  public emitTerminalKill() {
    this.getSocket().emit('terminal:kill');
  }

  public onTerminalStarted(callback: (data: { filename: string; language: string }) => void): () => void {
    const s = this.getSocket();
    s.on('terminal:started', callback);
    return () => {
      s.off('terminal:started', callback);
    };
  }

  public onTerminalOutput(callback: (data: { type: 'stdout' | 'stderr' | 'info' | 'system'; text: string }) => void): () => void {
    const s = this.getSocket();
    s.on('terminal:output', callback);
    return () => {
      s.off('terminal:output', callback);
    };
  }

  public onTerminalExit(callback: (data: { exitCode: number; executionTimeMs: number }) => void): () => void {
    const s = this.getSocket();
    s.on('terminal:exit', callback);
    return () => {
      s.off('terminal:exit', callback);
    };
  }
}

export const socketService = new SocketService();
