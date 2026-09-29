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
import type { 
  Participant, 
  ActivityEvent, 
  ConnectionState, 
  SupportedLanguage 
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

  // Workspace state
  const [language, setLanguage] = useState<SupportedLanguage>('html');
  const [documentContent, setDocumentContent] = useState<string>('');
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

  // Check URL param on mount (e.g., /?room=demo123)
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
      if (res.room?.language) {
        setLanguage(res.room.language);
      }
      if (res.documentContent) {
        setDocumentContent(res.documentContent);
      }

      // Initialize local user in participants list
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

      // Add join activity
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

      window.history.pushState({}, '', `?room=${encodeURIComponent(roomId)}`);
      addToast('success', `Joined workspace ${roomId}`);
    } catch (err: any) {
      setError(err.message || 'Error connecting to workspace');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (name: string, customRoomId?: string, passcode?: string) => {
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
      setLanguage(res.room.language);

      const defaultHtml = `<style>\n  .workspace {\n    background-color: #0E0F16;\n    color: #F2F2F5;\n    font-family: 'JetBrains Mono', monospace;\n    padding: 20px;\n  }\n</style>\n\n<script>\n  console.log("Welcome to Kollab!");\n</script>\n\n<div class=\"workspace\">\n  <h1>Collaborate. Code. Learn together.</h1>\n</div>\n`;
      setDocumentContent(defaultHtml);

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

  const handleLanguageChange = (newLang: SupportedLanguage) => {
    setLanguage(newLang);
    addToast('info', `Switched language to ${newLang.toUpperCase()}`);
    setActivities((prev) => [
      {
        id: 'act_' + Date.now(),
        roomId: activeRoomId || '',
        type: 'language',
        userId,
        userName: displayName,
        details: newLang.toUpperCase(),
        timestamp: new Date().toISOString(),
      },
      ...prev,
    ]);
  };

  const handleContentChange = (val: string) => {
    setDocumentContent(val);
  };

  const handleCursorChange = (line: number, _column: number) => {
    setParticipants((prev) =>
      prev.map((p) => (p.id === userId ? { ...p, currentLine: line } : p))
    );
  };

  return (
    <div style={{ width: '100%', height: '100%' }}>
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
          initialContent={documentContent}
          initialLanguage={language}
          onContentChange={handleContentChange}
          onLanguageChange={handleLanguageChange}
          onCursorChange={handleCursorChange}
          onLeaveRoom={handleLeaveRoom}
          toasts={toasts}
          onDismissToast={handleDismissToast}
        />
      )}
    </div>
  );
};

export default App;
