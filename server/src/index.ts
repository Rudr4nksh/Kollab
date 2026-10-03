import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
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

// Security Headers & Protection
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

import { roomRouter } from './rooms/roomRoutes.js';
import { githubAuthRouter } from './auth/githubAuth.js';
import { runnerRouter } from './runner/runnerRoutes.js';
import { aiRouter } from './ai/aiRoutes.js';

app.use(express.json({ limit: '10mb' }));
app.use('/api/rooms', roomRouter);
app.use('/api/auth/github', githubAuthRouter);
app.use('/api/runner', runnerRouter);
app.use('/api/ai', aiRouter);

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

// In production, serve the built Vite client frontend directly from Express
const clientDist = fs.existsSync(path.resolve(process.cwd(), 'client/dist'))
  ? path.resolve(process.cwd(), 'client/dist')
  : path.resolve(__dirname, '../../client/dist');

if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
      return next();
    }
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

server.listen(PORT, () => {
  console.log(`[Kollab Server] running on http://localhost:${PORT}`);
});

export { app, server };
