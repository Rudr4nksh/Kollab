/**
 * Kollab AI Service (BYOK - Bring Your Own Key)
 * 
 * Supports Anthropic (Claude), Google Gemini, and OpenAI.
 * Keys are passed per-user via request headers, never logged, and never persisted to server disk.
 */

export interface AIChatContext {
  activeFile?: string;
  language?: string;
  activeCode?: string;
  selection?: string;
  filesSummary?: string;
}

export interface ChatMessageItem {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIChatRequest {
  prompt: string;
  context?: AIChatContext;
  conversationHistory?: ChatMessageItem[];
  userId?: string;
  userName?: string;
  userApiKey?: string;
  userProvider?: 'claude' | 'gemini' | 'openai';
  userModel?: string;
}

export interface AIChatResponse {
  reply: string;
  suggestedCode?: string;
  suggestedLanguage?: string;
  provider: string;
  model: string;
}

export interface AIRefactorRequest {
  code: string;
  language: string;
  instruction: string;
  filename?: string;
  userApiKey?: string;
  userProvider?: 'claude' | 'gemini' | 'openai';
  userModel?: string;
}

export interface AIRefactorResponse {
  refactoredCode: string;
  explanation: string;
  provider: string;
  model: string;
}

export class AIService {
  private serverAnthropicKey: string;
  private serverGeminiKey: string;
  private serverOpenaiKey: string;

  constructor() {
    this.serverAnthropicKey = process.env.ANTHROPIC_API_KEY || '';
    this.serverGeminiKey = process.env.GEMINI_API_KEY || '';
    this.serverOpenaiKey = process.env.OPENAI_API_KEY || '';
  }

  public getStatus() {
    const hasServerKey = Boolean(this.serverAnthropicKey || this.serverGeminiKey || this.serverOpenaiKey);
    return {
      serverConfigured: hasServerKey,
      supportedProviders: [
        { id: 'claude', name: 'Anthropic Claude', models: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022'] },
        { id: 'gemini', name: 'Google Gemini', models: ['gemini-2.5-flash', 'gemini-1.5-pro'] },
        { id: 'openai', name: 'OpenAI', models: ['gpt-4o', 'gpt-4o-mini'] },
      ],
    };
  }

  /**
   * Main chat completion handler
   */
  public async chat(req: AIChatRequest): Promise<AIChatResponse> {
    const { provider, apiKey, model } = this.resolveAuth(req);

    if (provider === 'claude') {
      return await this.chatWithClaude(req, apiKey, model);
    } else if (provider === 'gemini') {
      return await this.chatWithGemini(req, apiKey, model);
    } else if (provider === 'openai') {
      return await this.chatWithOpenAI(req, apiKey, model);
    }

    throw new Error(`Unsupported AI provider: ${provider}`);
  }

  /**
   * Code refactoring handler
   */
  public async refactor(req: AIRefactorRequest): Promise<AIRefactorResponse> {
    const { provider, apiKey, model } = this.resolveAuth(req);

    if (provider === 'claude') {
      return await this.refactorWithClaude(req, apiKey, model);
    } else if (provider === 'gemini') {
      return await this.refactorWithGemini(req, apiKey, model);
    } else if (provider === 'openai') {
      return await this.refactorWithOpenAI(req, apiKey, model);
    }

    throw new Error(`Unsupported AI provider: ${provider}`);
  }

  private resolveAuth(req: { userApiKey?: string; userProvider?: string; userModel?: string }) {
    let provider = req.userProvider;
    let apiKey = req.userApiKey?.trim();

    if (!apiKey) {
      // Check server fallback environment
      if (this.serverAnthropicKey) {
        provider = 'claude';
        apiKey = this.serverAnthropicKey;
      } else if (this.serverGeminiKey) {
        provider = 'gemini';
        apiKey = this.serverGeminiKey;
      } else if (this.serverOpenaiKey) {
        provider = 'openai';
        apiKey = this.serverOpenaiKey;
      }
    }

    if (!apiKey) {
      throw new Error('No API key provided. Please connect your Claude, Gemini, or OpenAI API key in the AI Assistant settings.');
    }

    if (!provider) {
      if (apiKey.startsWith('sk-ant-')) provider = 'claude';
      else if (apiKey.startsWith('AIza')) provider = 'gemini';
      else if (apiKey.startsWith('sk-')) provider = 'openai';
      else provider = 'claude';
    }

    let defaultModel = 'claude-3-5-sonnet-20241022';
    if (provider === 'gemini') defaultModel = 'gemini-2.5-flash';
    if (provider === 'openai') defaultModel = 'gpt-4o-mini';

    return {
      provider,
      apiKey,
      model: req.userModel || defaultModel,
    };
  }

  // ==========================================
  // Claude (Anthropic API)
  // ==========================================
  private async chatWithClaude(req: AIChatRequest, apiKey: string, model: string): Promise<AIChatResponse> {
    const systemPrompt = this.buildSystemPrompt(req.context);
    const messages = [
      ...(req.conversationHistory || []).map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      })),
      { role: 'user', content: req.prompt },
    ];

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        system: systemPrompt,
        messages,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      let parsed = errText;
      try {
        const json = JSON.parse(errText);
        parsed = json.error?.message || errText;
      } catch {}
      throw new Error(`Claude error (${response.status}): ${parsed}`);
    }

    const data = (await response.json()) as any;
    const replyText = data.content?.[0]?.text || '';
    const extracted = this.extractCodeBlock(replyText);

    return {
      reply: replyText,
      suggestedCode: extracted?.code,
      suggestedLanguage: extracted?.language,
      provider: 'claude',
      model,
    };
  }

  private async refactorWithClaude(req: AIRefactorRequest, apiKey: string, model: string): Promise<AIRefactorResponse> {
    const prompt = `Refactor the following ${req.language} code according to this instruction:
Instruction: "${req.instruction}"
Filename: ${req.filename || 'active file'}

Original Code:
\`\`\`${req.language}
${req.code}
\`\`\`

Provide the COMPLETE updated code inside a single markdown code block (\`\`\`${req.language}... \`\`\`), followed by a brief bulleted explanation of what was changed.`;

    const res = await this.chatWithClaude({
      prompt,
      context: { activeCode: req.code, language: req.language, activeFile: req.filename },
    }, apiKey, model);

    const code = res.suggestedCode || req.code;
    return {
      refactoredCode: code,
      explanation: res.reply.replace(/```[\s\S]*?```/g, '').trim() || 'Code refactored as requested.',
      provider: 'claude',
      model,
    };
  }

  // ==========================================
  // Gemini (Google AI API)
  // ==========================================
  private async chatWithGemini(req: AIChatRequest, apiKey: string, model: string): Promise<AIChatResponse> {
    const systemPrompt = this.buildSystemPrompt(req.context);
    const contents: any[] = [];

    if (req.conversationHistory && req.conversationHistory.length > 0) {
      for (const m of req.conversationHistory) {
        contents.push({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        });
      }
    }
    contents.push({
      role: 'user',
      parts: [{ text: req.prompt }],
    });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 4096,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      let parsed = errText;
      try {
        const json = JSON.parse(errText);
        parsed = json.error?.message || errText;
      } catch {}
      throw new Error(`Gemini error (${response.status}): ${parsed}`);
    }

    const data = (await response.json()) as any;
    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const extracted = this.extractCodeBlock(replyText);

    return {
      reply: replyText,
      suggestedCode: extracted?.code,
      suggestedLanguage: extracted?.language,
      provider: 'gemini',
      model,
    };
  }

  private async refactorWithGemini(req: AIRefactorRequest, apiKey: string, model: string): Promise<AIRefactorResponse> {
    const prompt = `Refactor the following ${req.language} code according to this instruction:
Instruction: "${req.instruction}"
Filename: ${req.filename || 'active file'}

Original Code:
\`\`\`${req.language}
${req.code}
\`\`\`

Return the COMPLETE refactored code block (\`\`\`${req.language}... \`\`\`), and explain the key enhancements concisely.`;

    const res = await this.chatWithGemini({
      prompt,
      context: { activeCode: req.code, language: req.language, activeFile: req.filename },
    }, apiKey, model);

    const code = res.suggestedCode || req.code;
    return {
      refactoredCode: code,
      explanation: res.reply.replace(/```[\s\S]*?```/g, '').trim() || 'Code refactored successfully.',
      provider: 'gemini',
      model,
    };
  }

  // ==========================================
  // OpenAI (GPT-4o / GPT-4o-mini)
  // ==========================================
  private async chatWithOpenAI(req: AIChatRequest, apiKey: string, model: string): Promise<AIChatResponse> {
    const systemPrompt = this.buildSystemPrompt(req.context);
    const messages = [
      { role: 'system', content: systemPrompt },
      ...(req.conversationHistory || []).map((m) => ({
        role: m.role,
        content: m.content,
      })),
      { role: 'user', content: req.prompt },
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      let parsed = errText;
      try {
        const json = JSON.parse(errText);
        parsed = json.error?.message || errText;
      } catch {}
      throw new Error(`OpenAI error (${response.status}): ${parsed}`);
    }

    const data = (await response.json()) as any;
    const replyText = data.choices?.[0]?.message?.content || '';
    const extracted = this.extractCodeBlock(replyText);

    return {
      reply: replyText,
      suggestedCode: extracted?.code,
      suggestedLanguage: extracted?.language,
      provider: 'openai',
      model,
    };
  }

  private async refactorWithOpenAI(req: AIRefactorRequest, apiKey: string, model: string): Promise<AIRefactorResponse> {
    const prompt = `Refactor the following ${req.language} code according to this instruction:
Instruction: "${req.instruction}"
Filename: ${req.filename || 'active file'}

Original Code:
\`\`\`${req.language}
${req.code}
\`\`\`

Provide the COMPLETE updated code in a markdown block and a short explanation.`;

    const res = await this.chatWithOpenAI({
      prompt,
      context: { activeCode: req.code, language: req.language, activeFile: req.filename },
    }, apiKey, model);

    const code = res.suggestedCode || req.code;
    return {
      refactoredCode: code,
      explanation: res.reply.replace(/```[\s\S]*?```/g, '').trim() || 'Code refactored as requested.',
      provider: 'openai',
      model,
    };
  }

  // ==========================================
  // Helper methods
  // ==========================================
  private buildSystemPrompt(context?: AIChatContext): string {
    let base = `You are Kollab AI, an expert software engineer and friendly pair programmer built directly into Kollab—a real-time multiplayer code editor and development workspace.\n` +
      `Your goal is to help developers write clean, secure, idiomatic code, explain complex architectures, and fix bugs.\n` +
      `Always keep code suggestions concise and complete.\n`;

    if (context?.activeFile) {
      base += `\nCurrently Active File: ${context.activeFile}\nLanguage: ${context.language || 'plaintext'}\n`;
    }
    if (context?.activeCode) {
      base += `\nCurrent Code in Active File:\n\`\`\`${context.language || ''}\n${context.activeCode.slice(0, 8000)}\n\`\`\`\n`;
    }
    if (context?.selection) {
      base += `\nSelected Code snippet by user:\n\`\`\`\n${context.selection}\n\`\`\`\n`;
    }

    return base;
  }

  private extractCodeBlock(text: string): { code: string; language: string } | null {
    const match = text.match(/```([a-zA-Z0-9_\-+]*)\n([\s\S]*?)```/);
    if (match) {
      return {
        language: match[1] || 'plaintext',
        code: match[2].trim(),
      };
    }
    return null;
  }
}

export const aiService = new AIService();
