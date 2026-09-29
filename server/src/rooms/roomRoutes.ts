import { Router } from 'express';
import { z } from 'zod';
import { RoomService } from './RoomService.js';

export const roomRouter = Router();

// Validation schemas
const createRoomSchema = z.object({
  displayName: z.string().min(1, 'Display name is required').max(32),
  roomId: z.string().max(40).optional(),
  passcode: z.string().max(64).optional(),
  language: z.enum([
    'html',
    'javascript',
    'typescript',
    'python',
    'cpp',
    'java',
    'plaintext',
    'markdown'
  ]).optional(),
  userId: z.string().min(1),
});

const validateJoinSchema = z.object({
  roomId: z.string().min(1, 'Room ID is required').max(40),
  passcode: z.string().max(64).optional(),
  displayName: z.string().min(1, 'Display name is required').max(32),
  userId: z.string().min(1),
});

/**
 * POST /api/rooms - Create new workspace room
 */
roomRouter.post('/', async (req, res) => {
  try {
    const parseResult = createRoomSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: parseResult.error.errors[0]?.message || 'Invalid payload',
      });
    }

    const { displayName, roomId, passcode, language, userId } = parseResult.data;
    const result = await RoomService.createRoom(
      { displayName, roomId, passcode, language },
      userId
    );

    return res.status(201).json(result);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Failed to create room' });
  }
});

/**
 * POST /api/rooms/validate-join - Validate join permission and passcode
 */
roomRouter.post('/validate-join', async (req, res) => {
  try {
    const parseResult = validateJoinSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        isValid: false,
        error: parseResult.error.errors[0]?.message || 'Invalid join parameters',
      });
    }

    const result = await RoomService.validateJoin(parseResult.data);
    if (!result.isValid) {
      return res.status(401).json(result);
    }

    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ isValid: false, error: 'Internal server error validating room' });
  }
});

/**
 * GET /api/rooms/:roomId - Fetch room info
 */
roomRouter.get('/:roomId', async (req, res) => {
  try {
    const room = await RoomService.getRoom(req.params.roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    return res.json(room);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/rooms/:roomId/activities - Fetch recent activities
 */
roomRouter.get('/:roomId/activities', async (req, res) => {
  try {
    const activities = await RoomService.getActivities(req.params.roomId);
    return res.json(activities);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});
