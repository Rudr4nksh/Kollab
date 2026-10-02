import { Router } from 'express';
import { terminalService } from './terminalService.js';

export const terminalRouter = Router();

terminalRouter.post('/execute', async (req, res) => {
  try {
    const { roomId, command, files, cwd } = req.body;
    if (!command || typeof command !== 'string') {
      return res.status(400).json({ error: 'Command is required' });
    }

    const result = await terminalService.executeCommand(roomId || 'workspace', command, files, cwd);
    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Execution error' });
  }
});
