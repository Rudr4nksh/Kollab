import { Router } from 'express';
import { codeRunnerService } from './codeRunner.js';

export const runnerRouter = Router();

runnerRouter.post('/execute', async (req, res) => {
  try {
    const { language, code, input, filename } = req.body;
    if (!language || typeof code !== 'string') {
      return res.status(400).json({ error: 'Language and code are required.' });
    }

    if (code.length > 256 * 1024) {
      return res.status(400).json({ error: 'Code size exceeds 256KB limit.' });
    }

    const result = await codeRunnerService.execute({
      language,
      code,
      input: typeof input === 'string' ? input : '',
      filename,
    });

    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Execution error' });
  }
});
