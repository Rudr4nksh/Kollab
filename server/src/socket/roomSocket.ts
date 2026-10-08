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
  theme?: string;
  participants: Map<string, Participant>; // socketId -> Participant
  voiceUsers: Map<string, VoiceParticipant>; // userId -> VoiceParticipant
  messages: ChatMessage[];
  files: FileNode[];
  saveTimeout?: NodeJS.Timeout;
  emptyDeletionTimeout?: NodeJS.Timeout;
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
      if (session && session.emptyDeletionTimeout) {
        clearTimeout(session.emptyDeletionTimeout);
        session.emptyDeletionTimeout = undefined;
        console.log(`[RoomSocket] User joined room ${roomIdKey}, cancelled pending room deletion.`);
      }

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

      // If room currently has no host, first participant becomes host
      const existingHost = Array.from(session.participants.values()).find((p) => p.role === 'host');
      let assignedRole: UserRole = role;
      if (!existingHost) {
        assignedRole = 'host';
      } else if (assignedRole === 'host' || assignedRole === 'participant') {
        assignedRole = 'editor';
      }

      const participant: Participant = {
        id: userId,
        socketId: socket.id,
        name: displayName || 'Anonymous',
        role: assignedRole,
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
        theme: session.theme || 'kollab-obsidian',
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

    // Room-wide Theme synchronization
    socket.on('room-theme-update', (data: {
      roomId: string;
      userId: string;
      themeId: string;
    }) => {
      const { roomId, userId, themeId } = data;
      const roomIdKey = norm(roomId);
      const session = activeRooms.get(roomIdKey);
      if (session) {
        session.theme = themeId;
        socket.to(roomIdKey).emit('room-theme-changed', {
          themeId,
          userId,
        });
      }
    });

    // In-room Group Text Chat & Collaborative @ai Bot
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
        const trimmedText = text.trim();
        const message: ChatMessage = {
          id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
          roomId: roomIdKey,
          userId,
          userName: participant?.name || 'Collaborator',
          userColor: participant?.color || '#7357E8',
          text: trimmedText.slice(0, 1000), // Max 1000 chars per message
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

    // Update user role (Host / Co-Host permission control)
    socket.on('update-user-role', (data: {
      roomId: string;
      targetUserId: string;
      newRole: UserRole;
      actorUserId: string;
    }) => {
      const { roomId, targetUserId, newRole, actorUserId } = data;
      const roomIdKey = norm(roomId);
      const session = activeRooms.get(roomIdKey);
      if (!session) return;

      const actor = Array.from(session.participants.values()).find((p) => p.id === actorUserId);
      const target = Array.from(session.participants.values()).find((p) => p.id === targetUserId);
      if (!actor || !target) return;

      const isHost = actor.role === 'host';
      const isCoHost = actor.role === 'co-host';

      if (!isHost && !isCoHost) {
        socket.emit('error', { message: 'You do not have permission to change roles.' });
        return;
      }

      if (isCoHost) {
        if (target.role === 'host' || newRole === 'host' || newRole === 'co-host') {
          socket.emit('error', { message: 'Co-Hosts cannot modify Host roles or assign Co-Host.' });
          return;
        }
      }

      if (newRole === 'host') {
        // Transfer host from actor to target
        actor.role = 'co-host';
        target.role = 'host';
        session.participants.set(actor.socketId, actor);
        session.participants.set(target.socketId, target);

        io.to(roomIdKey).emit('host-transferred', {
          newHostId: target.id,
          newHostName: target.name,
          transferredBy: actor.id,
          reason: 'manual_transfer',
        });

        const chatMsg: ChatMessage = {
          id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          roomId: roomIdKey,
          userId: 'system',
          userName: 'System',
          userColor: '#8a4baf',
          text: `${actor.name} transferred Host ownership to ${target.name}.`,
          timestamp: Date.now(),
        };
        session.messages.push(chatMsg);
        if (session.messages.length > 200) session.messages.shift();
        io.to(roomIdKey).emit('chat-message', chatMsg);
      } else {
        target.role = newRole;
        session.participants.set(target.socketId, target);

        io.to(roomIdKey).emit('user-role-updated', {
          userId: target.id,
          newRole,
          updatedBy: actor.id,
          updatedByName: actor.name,
        });

        const chatMsg: ChatMessage = {
          id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          roomId: roomIdKey,
          userId: 'system',
          userName: 'System',
          userColor: '#8a4baf',
          text: `${actor.name} changed ${target.name}'s role to ${newRole.toUpperCase()}.`,
          timestamp: Date.now(),
        };
        session.messages.push(chatMsg);
        if (session.messages.length > 200) session.messages.shift();
        io.to(roomIdKey).emit('chat-message', chatMsg);
      }

      io.to(roomIdKey).emit('participants-updated', Array.from(session.participants.values()));
    });

    // Kick user from room
    socket.on('kick-user', (data: {
      roomId: string;
      targetUserId: string;
      actorUserId: string;
      reason?: string;
    }) => {
      const { roomId, targetUserId, actorUserId, reason = 'Removed by room moderator' } = data;
      const roomIdKey = norm(roomId);
      const session = activeRooms.get(roomIdKey);
      if (!session) return;

      const actor = Array.from(session.participants.values()).find((p) => p.id === actorUserId);
      const target = Array.from(session.participants.values()).find((p) => p.id === targetUserId);
      if (!actor || !target) return;

      const canKick =
        actor.role === 'host' ||
        (actor.role === 'co-host' && target.role !== 'host' && target.role !== 'co-host') ||
        (actor.role === 'admin' && (target.role === 'editor' || target.role === 'viewer' || target.role === 'participant'));

      if (!canKick) {
        socket.emit('error', { message: 'You do not have permission to remove this user.' });
        return;
      }

      // Notify target client they were kicked
      io.to(target.socketId).emit('user-kicked', {
        reason,
        kickedBy: actor.name,
      });

      // Remove target from room
      session.participants.delete(target.socketId);
      if (session.voiceUsers.has(target.id)) {
        session.voiceUsers.delete(target.id);
        io.to(roomIdKey).emit('voice-users-updated', Array.from(session.voiceUsers.values()));
      }

      const targetSocket = io.sockets.sockets.get(target.socketId);
      if (targetSocket) {
        targetSocket.leave(roomIdKey);
      }

      io.to(roomIdKey).emit('participants-updated', Array.from(session.participants.values()));

      const chatMsg: ChatMessage = {
        id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        roomId: roomIdKey,
        userId: 'system',
        userName: 'System',
        userColor: '#8a4baf',
        text: `${target.name} was removed from the workspace by ${actor.name}.`,
        timestamp: Date.now(),
      };
      session.messages.push(chatMsg);
      if (session.messages.length > 200) session.messages.shift();
      io.to(roomIdKey).emit('chat-message', chatMsg);
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

      // If room is empty (no one is in the room), permanently delete it after a 5s grace period
      if (session.participants.size === 0) {
        if (session.saveTimeout) {
          clearTimeout(session.saveTimeout);
          session.saveTimeout = undefined;
        }
        if (session.emptyDeletionTimeout) {
          clearTimeout(session.emptyDeletionTimeout);
        }

        const roomToDelete = currentRoomId;
        console.log(`[RoomSocket] Room ${roomToDelete} is now empty (0 participants). Scheduling permanent deletion in 5s...`);

        session.emptyDeletionTimeout = setTimeout(async () => {
          const currentSession = activeRooms.get(roomToDelete);
          if (currentSession && currentSession.participants.size === 0) {
            console.log(`[RoomSocket] No one is in room ${roomToDelete}. Permanently deleting room.`);
            activeRooms.delete(roomToDelete);
            try {
              await RoomService.deleteRoom(roomToDelete);
            } catch (err) {
              console.error(`[RoomSocket] Error deleting room ${roomToDelete}:`, err);
            }
          }
        }, 5000);
      } else {
        // Clear any deletion timer if participants remain
        if (session.emptyDeletionTimeout) {
          clearTimeout(session.emptyDeletionTimeout);
          session.emptyDeletionTimeout = undefined;
        }

        // Host succession logic: if the departing user was Host, transfer Host automatically
        if (participant && participant.role === 'host') {
          const remaining = Array.from(session.participants.values());
          if (remaining.length > 0) {
            // Succession priority:
            // 1. Co-host (earliest joined)
            // 2. Admin (earliest joined)
            // 3. Earliest joined participant
            const coHosts = remaining.filter((p) => p.role === 'co-host').sort((a, b) => a.joinedAt - b.joinedAt);
            const admins = remaining.filter((p) => p.role === 'admin').sort((a, b) => a.joinedAt - b.joinedAt);
            const others = remaining.sort((a, b) => a.joinedAt - b.joinedAt);

            const nextHost = coHosts[0] || admins[0] || others[0];
            if (nextHost) {
              nextHost.role = 'host';
              session.participants.set(nextHost.socketId, nextHost);
              console.log(`[RoomSocket] Host left. Transferred Host to ${nextHost.name} (${nextHost.id})`);

              io.to(currentRoomId).emit('host-transferred', {
                newHostId: nextHost.id,
                newHostName: nextHost.name,
                reason: 'previous_host_left',
              });

              const chatMsg: ChatMessage = {
                id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
                roomId: currentRoomId,
                userId: 'system',
                userName: 'System',
                userColor: '#8a4baf',
                text: `${nextHost.name} is now the workspace Host.`,
                timestamp: Date.now(),
              };
              session.messages.push(chatMsg);
              if (session.messages.length > 200) session.messages.shift();
              io.to(currentRoomId).emit('chat-message', chatMsg);
            }
          }
        }

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
