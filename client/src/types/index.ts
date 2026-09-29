export type SupportedLanguage = 
  | 'html' 
  | 'javascript' 
  | 'typescript' 
  | 'python' 
  | 'cpp' 
  | 'java' 
  | 'plaintext' 
  | 'markdown';

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
  | 'kicked';

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
}

export interface JoinRoomPayload {
  roomId: string;
  passcode?: string;
  displayName: string;
  userId?: string;
}

export type ConnectionState = 'connected' | 'reconnecting' | 'offline';
