import React, { useState, useEffect } from 'react';
import { HomePage } from './pages/Home/HomePage.tsx';
import { WorkspacePage } from './pages/Workspace/WorkspacePage.tsx';
import { 
  createRoom, 
  validateJoinRoom, 
  getStoredDisplayName, 
  getOrCreateUserId 
} from './services/api.ts';
import { getParticipantColor } from './services/colors.ts';
import { createDefaultProject } from './services/fileUtils.ts';
import type { 
  Participant, 
  ActivityEvent, 
  ConnectionState, 
  FileNode 
} from './types/index.ts';
import type { ToastMessage } from './components/UI/Toast.tsx';

export const App: React.FC = () => {
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [userId] = useState<string>(() => getOrCreateUserId());
  const [displayName, setDisplayName] = useState<string>(() => getStoredDisplayName());
  const [isHost, setIsHost] = useState<boolean>(false);
  const [hasPasscode, setHasPasscode] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Multi-file workspace state
  const [files, setFiles] = useState<FileNode[]>(() => createDefaultProject('web'));

  const [connectionState] = useState<ConnectionState>('connected');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'info' | 'success' | 'warning' | 'error', message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const handleDismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const saveRecentRoom = (roomId: string, name: string) => {
    try {
      const stored = localStorage.getItem('kollab_recent_workspaces');
      const recents = stored ? JSON.parse(stored) : [];
      const updated = [
        { roomId, name, timestamp: Date.now() },
        ...recents.filter((r: any) => r.roomId !== roomId),
      ].slice(0, 10);
      localStorage.setItem('kollab_recent_workspaces', JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  // Check URL query on mount (?room=demo123)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      const savedName = getStoredDisplayName();
      if (savedName) {
        setDisplayName(savedName);
      }
    }
  }, []);

  const handleJoin = async (roomId: string, name: string, passcode?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await validateJoinRoom({ roomId, displayName: name, passcode });
      if (!res.isValid) {
        setError(res.error || 'Failed to join room');
        setIsLoading(false);
        return;
      }

      setDisplayName(name);
      setIsHost(!!res.isHost);
      setActiveRoomId(res.room?.roomId || roomId);
      setHasPasscode(!!res.room?.hasPassword);

      if (res.documentContent) {
        // If single document was persisted, sync it to main file
        setFiles((prev) =>
          prev.map((f, idx) => (idx === 0 ? { ...f, content: res.documentContent } : f))
        );
      }

      const myParticipant: Participant = {
        id: userId,
        socketId: 'local',
        name,
        role: res.isHost ? 'host' : 'participant',
        status: 'active',
        color: getParticipantColor(userId),
        joinedAt: Date.now(),
      };
      setParticipants([myParticipant]);

      const joinActivity: ActivityEvent = {
        id: 'act_' + Date.now(),
        roomId,
        type: 'join',
        userId,
        userName: name,
        details: 'joined workspace',
        timestamp: new Date().toISOString(),
      };
      setActivities([joinActivity]);

      saveRecentRoom(roomId, name);
      window.history.pushState({}, '', `?room=${encodeURIComponent(roomId)}`);
      addToast('success', `Joined workspace ${roomId}`);
    } catch (err: any) {
      setError(err.message || 'Error connecting to workspace');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (
    name: string,
    customRoomId?: string,
    passcode?: string
  ) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await createRoom({
        displayName: name,
        roomId: customRoomId,
        passcode,
      });

      setDisplayName(name);
      setIsHost(true);
      setActiveRoomId(res.room.roomId);
      setHasPasscode(res.room.hasPassword);

      // Initialize clean workspace
      const starterFiles = createDefaultProject('web');
      setFiles(starterFiles);

      const myParticipant: Participant = {
        id: userId,
        socketId: 'local',
        name,
        role: 'host',
        status: 'active',
        color: getParticipantColor(userId),
        joinedAt: Date.now(),
      };
      setParticipants([myParticipant]);

      const createdActivity: ActivityEvent = {
        id: 'act_' + Date.now(),
        roomId: res.room.roomId,
        type: 'created',
        userId,
        userName: name,
        details: 'created workspace',
        timestamp: new Date().toISOString(),
      };
      setActivities([createdActivity]);

      saveRecentRoom(res.room.roomId, name);
      window.history.pushState({}, '', `?room=${encodeURIComponent(res.room.roomId)}`);
      addToast('success', `Created workspace ${res.room.roomId}`);
    } catch (err: any) {
      setError(err.message || 'Error creating workspace');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeaveRoom = () => {
    setActiveRoomId(null);
    window.history.pushState({}, '', window.location.pathname);
  };

  const handleRecordActivity = (type: string, details?: string) => {
    const act: ActivityEvent = {
      id: 'act_' + Date.now(),
      roomId: activeRoomId || '',
      type: type as any,
      userId,
      userName: displayName,
      details,
      timestamp: new Date().toISOString(),
    };
    setActivities((prev) => [act, ...prev]);
  };

  return (
    <div style={{ width: '100%', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {!activeRoomId ? (
        <HomePage
          onJoin={handleJoin}
          onCreate={handleCreate}
          error={error}
          isLoading={isLoading}
        />
      ) : (
        <WorkspacePage
          roomId={activeRoomId}
          userId={userId}
          displayName={displayName}
          isHost={isHost}
          hasPasscode={hasPasscode}
          connectionState={connectionState}
          participants={participants}
          activities={activities}
          files={files}
          onFilesChange={setFiles}
          onLeaveRoom={handleLeaveRoom}
          toasts={toasts}
          onDismissToast={handleDismissToast}
          onRecordActivity={handleRecordActivity}
        />
      )}
    </div>
  );
};

export default App;
