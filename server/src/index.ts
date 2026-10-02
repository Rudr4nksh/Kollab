import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { prisma } from './database/prisma.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 4000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

app.use(cors({
  origin: true,
  credentials: true,
}));

import { roomRouter } from './rooms/roomRoutes.js';
import { githubAuthRouter } from './auth/githubAuth.js';

app.use(express.json({ limit: '10mb' }));
app.use('/api/rooms', roomRouter);
app.use('/api/auth/github', githubAuthRouter);

import { setupSocketIO } from './socket/roomSocket.js';

export const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  maxHttpBufferSize: 2e6, // 2MB
});

setupSocketIO(io);

// Health check endpoint
app.get('/api/health', async (_req, res) => {
  try {
    const roomCount = await prisma.room.count();
    res.json({
      status: 'ok',
      service: 'Kollab Server',
      database: 'connected',
      roomCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: (error as Error).message });
  }
});

server.listen(PORT, () => {
  console.log(`[Kollab Server] running on http://localhost:${PORT}`);
});

export { app, server };
