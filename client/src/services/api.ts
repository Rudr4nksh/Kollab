import type { 
  ActivityEvent, 
  CreateRoomPayload, 
  JoinRoomPayload, 
  RoomMetadata 
} from '../types/index.ts';

const API_BASE = '/api';

/**
 * Get or generate persistent User ID for this browser session
 */
export function getOrCreateUserId(): string {
  const STORAGE_KEY = 'syncpad_user_id';
  let userId = localStorage.getItem(STORAGE_KEY);
  if (!userId) {
    userId = 'usr_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    localStorage.setItem(STORAGE_KEY, userId);
  }
  return userId;
}

export function getStoredDisplayName(): string {
  return localStorage.getItem('syncpad_display_name') || '';
}

export function setStoredDisplayName(name: string): void {
  localStorage.setItem('syncpad_display_name', name);
}

export async function createRoom(
  payload: CreateRoomPayload
): Promise<{ room: RoomMetadata; hostUserId: string }> {
  const userId = getOrCreateUserId();
  setStoredDisplayName(payload.displayName);

  const res = await fetch(`${API_BASE}/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, userId }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to create room');
  }

  return data;
}

export async function validateJoinRoom(
  payload: JoinRoomPayload
): Promise<{
  isValid: boolean;
  error?: string;
  room?: RoomMetadata;
  documentContent?: string;
  isHost?: boolean;
}> {
  const userId = getOrCreateUserId();
  setStoredDisplayName(payload.displayName);

  const res = await fetch(`${API_BASE}/rooms/validate-join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, userId }),
  });

  const data = await res.json();
  return data;
}

export async function getRoomMetadata(roomId: string): Promise<RoomMetadata> {
  const res = await fetch(`${API_BASE}/rooms/${encodeURIComponent(roomId)}`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Room not found');
  }
  return data;
}

export async function getRoomActivities(roomId: string): Promise<ActivityEvent[]> {
  const res = await fetch(`${API_BASE}/rooms/${encodeURIComponent(roomId)}/activities`);
  const data = await res.json();
  if (!res.ok) {
    return [];
  }
  return data;
}

export async function getAIStatus() {
  const res = await fetch(`${API_BASE}/ai/status`);
  if (!res.ok) {
    return { configured: false, provider: 'kollab-engine', displayName: 'Kollab Assistant', model: 'v1' };
  }
  return res.json();
}

export async function sendAIChat(payload: {
  prompt: string;
  context?: {
    activeFile?: string;
    language?: string;
    activeCode?: string;
    selection?: string;
  };
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  userName?: string;
}) {
  const res = await fetch(`${API_BASE}/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'AI request failed');
  }
  return data;
}

export async function sendAIRefactor(payload: {
  code: string;
  language: string;
  instruction: string;
  filename?: string;
}) {
  const res = await fetch(`${API_BASE}/ai/refactor`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'AI refactor failed');
  }
  return data;
}

