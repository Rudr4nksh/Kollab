import React, { useState, useEffect } from 'react';
import { HomePage } from './pages/Home/HomePage.tsx';
import { WorkspacePage } from './pages/Workspace/WorkspacePage.tsx';
import { 
  createRoom, 
  validateJoinRoom, 
  getStoredDisplayName, 
  getOrCreateUserId 
} from './services/api.ts';
import { socketService } from './services/socket.ts';
import { updateFileContentInTree } from './services/fileUtils.ts';
import { getParticipantColor } from './services/colors.ts';
import type { 
  Participant, 
  ActivityEvent, 
  ConnectionState, 
  FileNode,
  ChatMessage,
  VoiceParticipant
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

  // Multi-file workspace state - starts empty as requested
  const [files, setFiles] = useState<FileNode[]>([]);

  // Discord Chat & Voice State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [voiceUsers, setVoiceUsers] = useState<VoiceParticipant[]>([]);

  const [connectionState, setConnectionState] = useState<ConnectionState>('connected');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (
    type: 'info' | 'success' | 'warning' | 'error',
    message: string,
    action?: { label: string; onClick: () => void }
  ) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message, action }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
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


  // Listen for socket connection status
  useEffect(() => {
    return socketService.onConnectionStateChange((state) => {
      setConnectionState(state);
    });
  }, []);

  // Sync real-time multiplayer socket events when in a room
  useEffect(() => {
    if (!activeRoomId) return;

    socketService.joinRoom({
      roomId: activeRoomId,
      userId,
      displayName,
      role: isHost ? 'host' : 'participant',
    });

    const unsubs = [
      socketService.onRoomJoined((data) => {
        if (data.files && data.files.length > 0) {
          setFiles(data.files);
        }
        if (data.participants && data.participants.length > 0) {
          setParticipants(data.participants);
        }
        if (data.messages && data.messages.length > 0) {
          setMessages(data.messages);
        }
        if (data.voiceUsers && data.voiceUsers.length > 0) {
          setVoiceUsers(data.voiceUsers);
        }
      }),

      socketService.onParticipantsUpdated((updatedList) => {
        setParticipants(updatedList);
        const me = updatedList.find((p) => p.id === userId);
        if (me) {
          setIsHost(me.role === 'host');
        }
      }),

      socketService.onHostTransferred((data) => {
        if (data.newHostId === userId) {
          setIsHost(true);
          addToast('success', 'You are now the workspace Host.');
        } else {
          setIsHost(false);
          addToast('info', `${data.newHostName} is now the workspace Host.`);
        }
      }),

      socketService.onUserRoleUpdated((data) => {
        if (data.userId === userId) {
          if (data.newRole === 'host') {
            setIsHost(true);
            addToast('success', 'You are now the workspace Host.');
          } else {
            setIsHost(false);
            addToast('info', `Your role was updated to ${data.newRole.toUpperCase()} by ${data.updatedByName}.`);
          }
        }
      }),

      socketService.onUserKicked((data) => {
        addToast('error', `You were removed from the workspace: ${data.reason}`);
        sessionStorage.removeItem('kollab_active_session');
        setActiveRoomId(null);
        setFiles([]);
        setParticipants([]);
      }),

      socketService.onChatMessage((msg) => {
        setMessages((prev) => [...prev, msg]);
      }),

      socketService.onVoiceUsersUpdated((users) => {
        setVoiceUsers(users);
      }),

      socketService.onFilesTreeUpdate((data) => {
        if (data.userId !== userId) {
          setFiles(data.files);
        }
      }),

      socketService.onFileContentUpdate((data) => {
        if (data.userId !== userId) {
          setFiles((prev) => updateFileContentInTree(prev, data.filePath, data.content));
        }
      }),

      socketService.onPeerCursor((data) => {
        if (data.userId !== userId) {
          setParticipants((prev) =>
            prev.map((p) =>
              p.id === data.userId
                ? {
                    ...p,
                    cursor: data.cursor,
                    currentLine: data.line,
                    activeFilePath: data.filePath,
                  }
                : p
            )
          );
        }
      }),

      socketService.onPeerSelection((data) => {
        if (data.userId !== userId) {
          setParticipants((prev) =>
            prev.map((p) =>
              p.id === data.userId
                ? {
                    ...p,
                    selection: data.selection,
                    activeFilePath: data.filePath,
                  }
                : p
            )
          );
        }
      }),

      socketService.onActivityEvent((act) => {
        setActivities((prev) => [act, ...prev.slice(0, 49)]);
      }),
    ];

    return () => {
      unsubs.forEach((unsub) => unsub());
      socketService.leaveRoom();
    };
  }, [activeRoomId, userId, displayName, isHost]);

  const handleJoin = async (roomId: string, name: string, passcode?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await validateJoinRoom({ roomId, displayName: name, passcode });
      if (!res.isValid) {
        setError(res.error || 'Failed to join room');
        sessionStorage.removeItem('kollab_active_session');
        window.history.replaceState({}, '', window.location.pathname);
        setIsLoading(false);
        try {
          const stored = localStorage.getItem('kollab_recent_workspaces');
          if (stored) {
            const recents = JSON.parse(stored);
            const filtered = recents.filter((r: any) => r.roomId !== roomId);
            localStorage.setItem('kollab_recent_workspaces', JSON.stringify(filtered));
          }
        } catch {}
        return;
      }

      setDisplayName(name);
      setIsHost(!!res.isHost);
      setActiveRoomId(res.room?.roomId || roomId);
      setHasPasscode(!!res.room?.hasPassword);

      if (res.documentContent && res.documentContent.trim().length > 0) {
        // If single document was persisted in existing room
        setFiles([
          {
            id: 'file_main',
            name: 'main.js',
            path: '/main.js',
            type: 'file',
            language: (res.room?.language as any) || 'javascript',
            content: res.documentContent,
          },
        ]);
      } else {
        setFiles([]);
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

      sessionStorage.setItem(
        'kollab_active_session',
        JSON.stringify({ roomId, name, isHost: !!res.isHost, passcode })
      );
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

      // Initialize clean workspace - starts empty so user creates project folder
      setFiles([]);

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

      sessionStorage.setItem(
        'kollab_active_session',
        JSON.stringify({ roomId: res.room.roomId, name, isHost: true, passcode })
      );
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
    socketService.leaveRoom();
    sessionStorage.removeItem('kollab_active_session');
    setActiveRoomId(null);
    setFiles([]);
    setParticipants([]);
    setMessages([]);
    setVoiceUsers([]);
    window.history.pushState({}, '', window.location.pathname);
  };

  // Check URL query and saved active session on mount - seamlessly reconnect on page refresh without popups
  useEffect(() => {
    try {
      const activeSessionStr = sessionStorage.getItem('kollab_active_session');
      const params = new URLSearchParams(window.location.search);
      const roomParam = params.get('room');

      if (activeSessionStr) {
        const session = JSON.parse(activeSessionStr);
        if (session && session.roomId && (!roomParam || roomParam === session.roomId)) {
          handleJoin(session.roomId, session.name || getStoredDisplayName() || 'Anonymous', session.passcode);
          return;
        }
      }

      if (roomParam) {
        const savedName = getStoredDisplayName();
        if (savedName) {
          setDisplayName(savedName);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const handleSendMessage = (text: string) => {
    if (activeRoomId) {
      socketService.emitChatMessage(activeRoomId, userId, text);
    }
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
          setParticipants={setParticipants}
          activities={activities}
          files={files}
          onFilesChange={setFiles}
          onLeaveRoom={handleLeaveRoom}
          toasts={toasts}
          onDismissToast={handleDismissToast}
          onAddToast={addToast}
          onRecordActivity={handleRecordActivity}
          messages={messages}
          voiceUsers={voiceUsers}
          onSendMessage={handleSendMessage}
        />
      )}
    </div>
  );
};

export default App;
