import { Server as SocketIOServer, Socket } from 'socket.io';
import { prisma } from '../database/prisma.js';
import { RoomService } from '../rooms/RoomService.js';
import { interactiveRunner } from '../runner/interactiveRunner.js';
import type { 
  Participant, 
  FileNode, 
  ActivityEvent, 
  UserRole,
  CursorPosition,
  SelectionRange,
  ChatMessage,
  VoiceParticipant
} from '../types/index.js';

const PARTICIPANT_COLORS = [
  '#7357E8', // Violet
  '#38BDF8', // Cyan
  '#34D399', // Emerald
  '#F472B6', // Rose
  '#FBBF24', // Amber
  '#A78BFA', // Purple
  '#4ADE80', // Mint
  '#FB923C', // Orange
  '#2DD4BF', // Teal
  '#E879F9', // Fuchsia
];

function getParticipantColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % PARTICIPANT_COLORS.length;
  return PARTICIPANT_COLORS[index];
}

interface RoomSession {
  roomId: string;
  participants: Map<string, Participant>; // socketId -> Participant
  voiceUsers: Map<string, VoiceParticipant>; // userId -> VoiceParticipant
  messages: ChatMessage[];
  files: FileNode[];
  saveTimeout?: NodeJS.Timeout;
}

const activeRooms = new Map<string, RoomSession>();

function norm(id: string): string {
  return (id || '').trim().toLowerCase();
}

function updateContentInTree(nodes: FileNode[], path: string, content: string): FileNode[] {
  return nodes.map((node) => {
    if (node.path === path) {
      return { ...node, content };
    }
    if (node.children) {
      return { ...node, children: updateContentInTree(node.children, path, content) };
    }
    return node;
  });
}

function findFileInTree(nodes: FileNode[], path: string): FileNode | null {
  for (const node of nodes) {
    if (node.path === path) return node;
    if (node.children) {
      const found = findFileInTree(node.children, path);
      if (found) return found;
    }
  }
  return null;
}

export function setupSocketIO(io: SocketIOServer) {
  io.on('connection', (socket: Socket) => {
    interactiveRunner.registerSocket(socket);
    let currentRoomId: string | null = null;
    let currentUserId: string | null = null;

    // Join room
    socket.on('join-room', async (payload: {
      roomId: string;
      userId: string;
      displayName: string;
      role?: UserRole;
    }) => {
      const { roomId, userId, displayName, role = 'participant' } = payload;
      const roomIdKey = norm(roomId);
      currentRoomId = roomIdKey;
      currentUserId = userId;

      socket.join(roomIdKey);

      let session = activeRooms.get(roomIdKey);
      if (!session) {
        // Initialize room session
        let initialFiles: FileNode[] = [];
        try {
          const dbRoom = await RoomService.findRoomRecord(roomId);
          if (dbRoom && dbRoom.document && dbRoom.document.trim().length > 0) {
            initialFiles = [
              {
                id: 'file_main',
                name: 'main.js',
                path: '/main.js',
                type: 'file',
                language: 'javascript',
                content: dbRoom.document,
              },
            ];
          }
        } catch {
          // fallback to empty
        }

        session = {
          roomId: roomIdKey,
          participants: new Map(),
          voiceUsers: new Map(),
          messages: [],
          files: initialFiles,
        };
        activeRooms.set(roomIdKey, session);
      }

      const participant: Participant = {
        id: userId,
        socketId: socket.id,
        name: displayName || 'Anonymous',
        role,
        status: 'active',
        color: getParticipantColor(userId),
        joinedAt: Date.now(),
      };

      session.participants.set(socket.id, participant);

      // Send initial room snapshot to joining user
      socket.emit('room-joined', {
        participants: Array.from(session.participants.values()),
        voiceUsers: Array.from(session.voiceUsers.values()),
        messages: session.messages,
        files: session.files,
        yourParticipant: participant,
      });

      // Broadcast updated participants list to everyone in room
      io.to(roomIdKey).emit('participants-updated', Array.from(session.participants.values()));

      // Broadcast join activity
      const joinActivity: ActivityEvent = {
        id: 'act_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        roomId: roomIdKey,
        type: 'join',
        userId,
        userName: displayName,
        details: 'joined the room',
        timestamp: new Date().toISOString(),
      };

      io.to(roomIdKey).emit('activity-event', joinActivity);

      try {
        const dbRoom = await RoomService.findRoomRecord(roomId);
        if (dbRoom) {
          await prisma.activity.create({
            data: {
              roomId: dbRoom.roomId,
              type: 'join',
              userId,
              userName: displayName,
              details: 'joined the room',
            },
          });
        }
      } catch {
        // Non-blocking
      }
    });

    // File Content Editing (Real-time code synchronization)
    socket.on('file-content-change', (data: {
      roomId: string;
      filePath: string;
      content: string;
      userId: string;
    }) => {
      const { roomId, filePath, content, userId } = data;
      const roomIdKey = norm(roomId);
      const session = activeRooms.get(roomIdKey);
      if (session) {
        session.files = updateContentInTree(session.files, filePath, content);

        // Broadcast code update to all OTHER participants in the room
        socket.to(roomIdKey).emit('file-content-update', {
          filePath,
          content,
          userId,
        });

        // Debounce save to database (save after 1.5 seconds of inactivity)
        if (session.saveTimeout) {
          clearTimeout(session.saveTimeout);
        }
        session.saveTimeout = setTimeout(async () => {
          try {
            const firstFile = findFileInTree(session.files, filePath) || session.files[0];
            if (firstFile && firstFile.content !== undefined) {
              const dbRoom = await RoomService.findRoomRecord(roomId);
              if (dbRoom) {
                await prisma.room.update({
                  where: { roomId: dbRoom.roomId },
                  data: {
                    document: firstFile.content,
                    language: firstFile.language || 'javascript',
                  },
                });
              }
            }
          } catch {
            // Ignore DB save errors in background
          }
        }, 1500);
      }
    });

    // Full file tree update (create file, create folder, delete file/folder, import)
    socket.on('files-tree-update', (data: {
      roomId: string;
      files: FileNode[];
      userId: string;
      actionDetails?: string;
      actionType?: 'file_created' | 'file_deleted' | 'folder_created';
    }) => {
      const { roomId, files, userId, actionDetails, actionType = 'file_created' } = data;
      const roomIdKey = norm(roomId);
      const session = activeRooms.get(roomIdKey);
      if (session) {
        session.files = files;

        // Broadcast updated file tree to peers
        socket.to(roomIdKey).emit('files-tree-update', {
          files,
          userId,
        });

        if (actionDetails) {
          const participant = session.participants.get(socket.id);
          const act: ActivityEvent = {
            id: 'act_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            roomId: roomIdKey,
            type: actionType,
            userId,
            userName: participant?.name || 'Collaborator',
            details: actionDetails,
            timestamp: new Date().toISOString(),
          };

          io.to(roomIdKey).emit('activity-event', act);
        }
      }
    });

    // Cursor position broadcast
    socket.on('cursor-move', (data: {
      roomId: string;
      userId: string;
      filePath: string;
      cursor: CursorPosition;
    }) => {
      const { roomId, userId, filePath, cursor } = data;
      const roomIdKey = norm(roomId);
      const session = activeRooms.get(roomIdKey);
      if (session) {
        const participant = session.participants.get(socket.id);
        if (participant) {
          participant.cursor = cursor;
          participant.currentLine = cursor.line;
          participant.activeFilePath = filePath;
        }

        socket.to(roomIdKey).emit('peer-cursor', {
          userId,
          filePath,
          cursor,
          line: cursor.line,
        });
      }
    });

    // Selection range broadcast
    socket.on('selection-change', (data: {
      roomId: string;
      userId: string;
      filePath: string;
      selection: SelectionRange;
    }) => {
      const { roomId, userId, filePath, selection } = data;
      const roomIdKey = norm(roomId);
      const session = activeRooms.get(roomIdKey);
      if (session) {
        const participant = session.participants.get(socket.id);
        if (participant) {
          participant.selection = selection;
          participant.activeFilePath = filePath;
        }

        socket.to(roomIdKey).emit('peer-selection', {
          userId,
          filePath,
          selection,
        });
      }
    });

    // In-room Group Text Chat
    socket.on('chat-message', (data: {
      roomId: string;
      userId: string;
      text: string;
    }) => {
      const { roomId, userId, text } = data;
      const roomIdKey = norm(roomId);
      const session = activeRooms.get(roomIdKey);
      if (session && text.trim().length > 0) {
        const participant = session.participants.get(socket.id);
        const message: ChatMessage = {
          id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
          roomId: roomIdKey,
          userId,
          userName: participant?.name || 'Collaborator',
          userColor: participant?.color || '#7357E8',
          text: text.trim().slice(0, 1000), // Max 1000 chars per message
          timestamp: Date.now(),
        };

        session.messages.push(message);
        if (session.messages.length > 100) {
          session.messages.shift();
        }

        io.to(roomIdKey).emit('chat-message', message);
      }
    });

    // Voice Channel: Join
    socket.on('voice-join', (data: { roomId: string; userId: string }) => {
      const { roomId, userId } = data;
      const roomIdKey = norm(roomId);
      const session = activeRooms.get(roomIdKey);
      if (session) {
        const participant = session.participants.get(socket.id);
        const voiceUser: VoiceParticipant = {
          userId,
          socketId: socket.id,
          userName: participant?.name || 'Collaborator',
          userColor: participant?.color || '#7357E8',
          isMuted: false,
          isDeafened: false,
          isSpeaking: false,
        };
        session.voiceUsers.set(userId, voiceUser);

        // Notify entire room of updated voice members
        io.to(roomIdKey).emit('voice-users-updated', Array.from(session.voiceUsers.values()));
      }
    });

    // Voice Channel: Leave
    socket.on('voice-leave', (data: { roomId: string; userId: string }) => {
      const { roomId, userId } = data;
      const roomIdKey = norm(roomId);
      const session = activeRooms.get(roomIdKey);
      if (session) {
        session.voiceUsers.delete(userId);
        io.to(roomIdKey).emit('voice-users-updated', Array.from(session.voiceUsers.values()));
      }
    });

    // Voice Channel: WebRTC P2P Signaling (SDP Offer/Answer & ICE Candidates)
    socket.on('voice-signal', (data: {
      roomId: string;
      targetUserId: string;
      fromUserId: string;
      signal: any;
    }) => {
      const { roomId, targetUserId, fromUserId, signal } = data;
      const roomIdKey = norm(roomId);
      const session = activeRooms.get(roomIdKey);
      if (session) {
        const targetVoiceUser = session.voiceUsers.get(targetUserId);
        if (targetVoiceUser) {
          io.to(targetVoiceUser.socketId).emit('voice-signal', {
            fromUserId,
            fromSocketId: socket.id,
            signal,
          });
        }
      }
    });

    // Voice Channel: State update (Mute, Deafen, Speaking)
    socket.on('voice-state', (data: {
      roomId: string;
      userId: string;
      isMuted?: boolean;
      isDeafened?: boolean;
      isSpeaking?: boolean;
    }) => {
      const { roomId, userId } = data;
      const roomIdKey = norm(roomId);
      const session = activeRooms.get(roomIdKey);
      if (session) {
        const voiceUser = session.voiceUsers.get(userId);
        if (voiceUser) {
          if (data.isMuted !== undefined) voiceUser.isMuted = data.isMuted;
          if (data.isDeafened !== undefined) voiceUser.isDeafened = data.isDeafened;
          if (data.isSpeaking !== undefined) voiceUser.isSpeaking = data.isSpeaking;

          io.to(roomIdKey).emit('voice-users-updated', Array.from(session.voiceUsers.values()));
        }
      }
    });

    // Clean disconnect / leave room
    const handleLeave = async () => {
      if (!currentRoomId) return;
      const session = activeRooms.get(currentRoomId);
      if (!session) return;

      const participant = session.participants.get(socket.id);
      session.participants.delete(socket.id);

      // Clean voice channel if user was connected
      if (currentUserId && session.voiceUsers.has(currentUserId)) {
        session.voiceUsers.delete(currentUserId);
        io.to(currentRoomId).emit('voice-users-updated', Array.from(session.voiceUsers.values()));
      }

      // If room is empty, clear timeout and cleanup
      if (session.participants.size === 0) {
        if (session.saveTimeout) {
          clearTimeout(session.saveTimeout);
        }
      } else {
        // Notify others
        io.to(currentRoomId).emit(
          'participants-updated',
          Array.from(session.participants.values())
        );

        if (participant) {
          const leaveActivity: ActivityEvent = {
            id: 'act_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            roomId: currentRoomId,
            type: 'leave',
            userId: participant.id,
            userName: participant.name,
            details: 'left the room',
            timestamp: new Date().toISOString(),
          };

          io.to(currentRoomId).emit('activity-event', leaveActivity);
        }
      }

      socket.leave(currentRoomId);
      currentRoomId = null;
    };

    socket.on('leave-room', handleLeave);
    socket.on('disconnect', handleLeave);
  });
}
