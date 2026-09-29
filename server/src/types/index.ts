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

export interface Participant {
  id: string;
  socketId: string;
  name: string;
  role: UserRole;
  status: PresenceStatus;
  color: string;
  joinedAt: number;
  currentLine?: number;
  cursor?: {
    line: number;
    column: number;
  };
  selection?: {
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
  };
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
