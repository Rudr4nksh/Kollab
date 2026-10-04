import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../database/prisma.js';
import type { 
  CreateRoomPayload, 
  JoinRoomPayload, 
  RoomMetadata, 
  SupportedLanguage 
} from '../types/index.js';

export class RoomService {
  /**
   * Generates a clean, readable room ID like "room-7F4K2" or sanitizes custom ID
   */
  static generateRoomId(): string {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `room-${code}`;
  }

  /**
   * Sanitize room ID while preserving character casing
   */
  static sanitizeRoomId(roomId: string): string {
    return roomId.trim().replace(/[^a-zA-Z0-9_-]/g, '');
  }

  /**
   * Helper to find room record with case-insensitive fallback
   */
  static async findRoomRecord(roomId: string) {
    const clean = this.sanitizeRoomId(roomId);
    if (!clean) return null;

    // Direct match first
    const room = await prisma.room.findUnique({
      where: { roomId: clean },
    });
    if (room) return room;

    // Case-insensitive match fallback
    const all = await prisma.room.findMany();
    return all.find((r) => r.roomId.toLowerCase() === clean.toLowerCase()) || null;
  }

  /**
   * Sanitize user display name
   */
  static sanitizeDisplayName(name: string): string {
    return name.trim().replace(/[<>]/g, '').slice(0, 32);
  }

  /**
   * Create a new room with optional hashed passcode
   */
  static async createRoom(
    payload: CreateRoomPayload,
    creatorUserId: string
  ): Promise<{ room: RoomMetadata; hostUserId: string }> {
    let targetRoomId = payload.roomId 
      ? this.sanitizeRoomId(payload.roomId) 
      : this.generateRoomId();

    if (!targetRoomId) {
      targetRoomId = this.generateRoomId();
    }

    // Check if room already exists
    const existing = await this.findRoomRecord(targetRoomId);

    if (existing) {
      throw new Error(`Room '${targetRoomId}' already exists. Please choose another ID or join it.`);
    }

    let passwordHash: string | null = null;
    if (payload.passcode && payload.passcode.trim().length > 0) {
      passwordHash = await bcrypt.hash(payload.passcode.trim(), 10);
    }

    // New rooms start completely empty
    const room = await prisma.room.create({
      data: {
        roomId: targetRoomId,
        passwordHash,
        hostUserId: creatorUserId,
        language: payload.language || 'javascript',
        document: '',
      },
    });

    // Record room creation activity
    await prisma.activity.create({
      data: {
        roomId: room.roomId,
        type: 'created',
        userId: creatorUserId,
        userName: this.sanitizeDisplayName(payload.displayName),
        details: 'created workspace',
      },
    });

    return {
      room: {
        id: room.id,
        roomId: room.roomId,
        hostUserId: room.hostUserId,
        hasPassword: !!room.passwordHash,
        language: room.language as SupportedLanguage,
        participantCount: 0,
        createdAt: room.createdAt.toISOString(),
        updatedAt: room.updatedAt.toISOString(),
      },
      hostUserId: room.hostUserId,
    };
  }

  /**
   * Validate and admit user to room
   */
  static async validateJoin(
    payload: JoinRoomPayload
  ): Promise<{
    isValid: boolean;
    error?: string;
    room?: RoomMetadata;
    documentContent?: string;
    isHost?: boolean;
  }> {
    const room = await this.findRoomRecord(payload.roomId);

    if (!room) {
      return {
        isValid: false,
        error: 'Room not found. Check the room ID and try again.',
      };
    }

    // If room is protected with passcode, verify
    if (room.passwordHash) {
      if (!payload.passcode) {
        return {
          isValid: false,
          error: 'This room requires a passcode.',
        };
      }

      const match = await bcrypt.compare(payload.passcode, room.passwordHash);
      if (!match) {
        return {
          isValid: false,
          error: 'Incorrect passcode.',
        };
      }
    }

    const isHost = payload.userId === room.hostUserId;

    return {
      isValid: true,
      room: {
        id: room.id,
        roomId: room.roomId,
        hostUserId: room.hostUserId,
        hasPassword: !!room.passwordHash,
        language: room.language as SupportedLanguage,
        participantCount: 0,
        createdAt: room.createdAt.toISOString(),
        updatedAt: room.updatedAt.toISOString(),
      },
      documentContent: room.document,
      isHost,
    };
  }

  /**
   * Get room metadata
   */
  static async getRoom(roomId: string): Promise<RoomMetadata | null> {
    const room = await this.findRoomRecord(roomId);

    if (!room) return null;

    return {
      id: room.id,
      roomId: room.roomId,
      hostUserId: room.hostUserId,
      hasPassword: !!room.passwordHash,
      language: room.language as SupportedLanguage,
      participantCount: 0,
      createdAt: room.createdAt.toISOString(),
      updatedAt: room.updatedAt.toISOString(),
    };
  }

  /**
   * Update room language
   */
  static async updateLanguage(roomId: string, language: SupportedLanguage): Promise<void> {
    const room = await this.findRoomRecord(roomId);
    if (room) {
      await prisma.room.update({
        where: { roomId: room.roomId },
        data: { language },
      });
    }
  }

  /**
   * Persist document state and text content
   */
  static async persistDocument(roomId: string, text: string, docState?: Uint8Array): Promise<void> {
    const room = await this.findRoomRecord(roomId);
    if (room) {
      await prisma.room.update({
        where: { roomId: room.roomId },
        data: {
          document: text,
          ...(docState ? { docState: Buffer.from(docState) } : {}),
        },
      });
    }
  }

  /**
   * Update host user ID in database
   */
  static async updateHost(roomId: string, newHostUserId: string): Promise<void> {
    const room = await this.findRoomRecord(roomId);
    if (room) {
      await prisma.room.update({
        where: { roomId: room.roomId },
        data: { hostUserId: newHostUserId },
      });
    }
  }

  /**
   * Get recent activities for a room
   */
  static async getActivities(roomId: string, limit = 40) {
    const room = await this.findRoomRecord(roomId);
    const targetId = room ? room.roomId : this.sanitizeRoomId(roomId);
    const activities = await prisma.activity.findMany({
      where: { roomId: targetId },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    return activities.map((a) => ({
      id: a.id,
      roomId: a.roomId,
      type: a.type as any,
      userId: a.userId,
      userName: a.userName,
      details: a.details || undefined,
      timestamp: a.timestamp.toISOString(),
    }));
  }

  /**
   * Record new activity
   */
  static async recordActivity(
    roomId: string,
    type: string,
    userId: string,
    userName: string,
    details?: string
  ) {
    const room = await this.findRoomRecord(roomId);
    const targetId = room ? room.roomId : this.sanitizeRoomId(roomId);
    const activity = await prisma.activity.create({
      data: {
        roomId: targetId,
        type,
        userId,
        userName: this.sanitizeDisplayName(userName),
        details,
      },
    });

    return {
      id: activity.id,
      roomId: activity.roomId,
      type: activity.type as any,
      userId: activity.userId,
      userName: activity.userName,
      details: activity.details || undefined,
      timestamp: activity.timestamp.toISOString(),
    };
  }

  /**
   * Permanently delete a room and all its associated data
   */
  static async deleteRoom(roomId: string): Promise<boolean> {
    try {
      const room = await this.findRoomRecord(roomId);
      if (!room) return false;

      // Clean up activities
      await prisma.activity.deleteMany({
        where: { roomId: room.roomId },
      });

      // Permanently remove the room record
      await prisma.room.delete({
        where: { roomId: room.roomId },
      });

      console.log(`[RoomService] Room ${room.roomId} permanently deleted from database.`);
      return true;
    } catch (err) {
      console.error(`[RoomService] Failed to permanently delete room ${roomId}:`, err);
      return false;
    }
  }
}
