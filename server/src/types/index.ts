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

export type UserRole = 'host' | 'participant';

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
  | 'file_deleted'
  | 'folder_created'
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

export interface JoinRoomPayload {
  roomId: string;
  passcode?: string;
  displayName: string;
  userId?: string;
}

export interface CreateRoomPayload {
  roomId?: string;
  passcode?: string;
  displayName: string;
  language?: SupportedLanguage;
}
