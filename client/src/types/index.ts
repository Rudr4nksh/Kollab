export type SupportedLanguage = 
  // Web Development
  | 'javascript' 
  | 'typescript' 
  | 'html' 
  | 'css' 
  | 'scss'
  | 'json' 
  | 'yaml'
  | 'xml'
  | 'php'
  | 'ruby'
  | 'graphql'
  // DSA & Systems Programming
  | 'c'
  | 'cpp' 
  | 'java' 
  | 'rust'
  | 'go'
  | 'kotlin'
  | 'csharp'
  | 'swift'
  | 'dart'
  // AI / ML & Data Science
  | 'python' 
  | 'r'
  | 'julia'
  | 'sql'
  | 'shell'
  // General & Docs
  | 'markdown'
  | 'dockerfile'
  | 'plaintext';

export type UserRole = 'host' | 'co-host' | 'admin' | 'editor' | 'viewer' | 'participant';

export type PresenceStatus = 'active' | 'typing' | 'idle';

export interface CursorPosition {
  line: number;
  column: number;
}

export interface SelectionRange {
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
}

export interface Participant {
  id: string;
  socketId: string;
  name: string;
  role: UserRole;
  status: PresenceStatus;
  color: string;
  joinedAt: number;
  currentLine?: number;
  activeFilePath?: string;
  cursor?: CursorPosition;
  selection?: SelectionRange;
}

export type ActivityType = 
  | 'created' 
  | 'join' 
  | 'leave' 
  | 'edit' 
  | 'language' 
  | 'host_transfer' 
  | 'kicked'
  | 'file_created'
  | 'run_code';

export interface ActivityEvent {
  id: string;
  roomId: string;
  type: ActivityType;
  userId: string;
  userName: string;
  details?: string;
  timestamp: string;
}

export interface RoomMetadata {
  id: string;
  roomId: string;
  hostUserId: string;
  hasPassword: boolean;
  language: SupportedLanguage;
  participantCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRoomPayload {
  roomId?: string;
  passcode?: string;
  displayName: string;
  language?: SupportedLanguage;
  template?: 'web' | 'python' | 'javascript' | 'blank';
}

export interface JoinRoomPayload {
  roomId: string;
  passcode?: string;
  displayName: string;
  userId?: string;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  userId: string;
  userName: string;
  userColor: string;
  text: string;
  timestamp: number;
}

export interface VoiceParticipant {
  userId: string;
  socketId: string;
  userName: string;
  userColor: string;
  isMuted: boolean;
  isDeafened: boolean;
  isSpeaking: boolean;
}

export type ConnectionState = 'connected' | 'reconnecting' | 'offline';

export interface FileNode {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'folder';
  content?: string;
  language?: SupportedLanguage;
  children?: FileNode[];
  isOpen?: boolean;
}

export interface ConsoleLogItem {
  id: string;
  type: 'stdout' | 'stderr' | 'info' | 'system' | 'result';
  text: string;
  timestamp: string;
}

export interface AIProviderStatus {
  configured: boolean;
  provider: 'claude' | 'gemini' | 'openai' | 'kollab-engine';
  displayName: string;
  model: string;
}

export interface AIProposal {
  id: string;
  filePath: string;
  originalCode: string;
  proposedCode: string;
  explanation: string;
  requestedBy: string;
  timestamp: number;
}

