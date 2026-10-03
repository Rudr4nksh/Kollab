import { Router } from 'express';
import { aiService, AIChatRequest, AIRefactorRequest } from './aiService.js';

export const aiRouter = Router();

// GET /api/ai/status
aiRouter.get('/status', (_req, res) => {
  const status = aiService.getStatus();
  res.json(status);
});

// POST /api/ai/chat
aiRouter.post('/chat', async (req, res) => {
  try {
    const { prompt, context, conversationHistory, userId, userName } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const userApiKey = (req.headers['x-user-api-key'] as string) || req.body.userApiKey;
    const userProvider = ((req.headers['x-user-ai-provider'] as string) || req.body.userProvider) as any;
    const userModel = (req.headers['x-user-ai-model'] as string) || req.body.userModel;

    const payload: AIChatRequest = {
      prompt: prompt.trim(),
      context,
      conversationHistory,
      userId,
      userName,
      userApiKey,
      userProvider,
      userModel,
    };

    const response = await aiService.chat(payload);
    res.json(response);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'AI request failed' });
  }
});

// POST /api/ai/refactor
aiRouter.post('/refactor', async (req, res) => {
  try {
    const { code, language, instruction, filename } = req.body;
    if (typeof code !== 'string' || !instruction) {
      return res.status(400).json({ error: 'Code and instruction are required' });
    }

    const userApiKey = (req.headers['x-user-api-key'] as string) || req.body.userApiKey;
    const userProvider = ((req.headers['x-user-ai-provider'] as string) || req.body.userProvider) as any;
    const userModel = (req.headers['x-user-ai-model'] as string) || req.body.userModel;

    const payload: AIRefactorRequest = {
      code,
      language: language || 'javascript',
      instruction,
      filename,
      userApiKey,
      userProvider,
      userModel,
    };

    const response = await aiService.refactor(payload);
    res.json(response);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'AI refactor failed' });
  }
});
