/**
 * Kollab AI Service (BYOK - Bring Your Own Key)
 * 
 * Verified & tested with:
 * - Google Gemini (gemini-2.0-flash / gemini-1.5-flash with auto-fallback)
 * - Anthropic Claude (claude-3-5-sonnet-20241022 / claude-3-5-haiku with alternating message sanitization)
 * - OpenAI (gpt-4o-mini / gpt-4o)
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
        { id: 'claude', name: 'Anthropic Claude', defaultModel: 'claude-3-5-sonnet-20241022' },
        { id: 'gemini', name: 'Google Gemini', defaultModel: 'gemini-2.0-flash' },
        { id: 'openai', name: 'OpenAI', defaultModel: 'gpt-4o-mini' },
      ],
    };
  }

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
    if (provider === 'gemini') {
      // Auto-heal legacy or typo names
      if (!req.userModel || req.userModel === 'gemini-2.5-flash') {
        defaultModel = 'gemini-2.0-flash';
      } else {
        defaultModel = req.userModel;
      }
    } else if (provider === 'openai') {
      defaultModel = req.userModel || 'gpt-4o-mini';
    } else if (provider === 'claude') {
      defaultModel = req.userModel || 'claude-3-5-sonnet-20241022';
    }

    return {
      provider,
      apiKey,
      model: defaultModel,
    };
  }

  // ==========================================
  // Claude (Anthropic API)
  // ==========================================
  private async chatWithClaude(req: AIChatRequest, apiKey: string, model: string): Promise<AIChatResponse> {
    const systemPrompt = this.buildSystemPrompt(req.context);
    const messages = this.sanitizeClaudeMessages(req.conversationHistory, req.prompt);

    let activeModel = model;
    let response = await this.callClaudeAPI(apiKey, activeModel, systemPrompt, messages);

    // Auto-fallback if model not found on user account
    if (!response.ok && (response.status === 404 || response.status === 400)) {
      const errText = await response.clone().text();
      if (errText.includes('model') || response.status === 404) {
        const fallback = activeModel.includes('haiku') ? 'claude-3-5-sonnet-20241022' : 'claude-3-5-haiku-20241022';
        const retryRes = await this.callClaudeAPI(apiKey, fallback, systemPrompt, messages);
        if (retryRes.ok) {
          response = retryRes;
          activeModel = fallback;
        }
      }
    }

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
      model: activeModel,
    };
  }

  private async callClaudeAPI(apiKey: string, model: string, system: string, messages: any[]) {
    return await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        system,
        messages,
      }),
    });
  }

  private sanitizeClaudeMessages(history: ChatMessageItem[] = [], prompt: string) {
    const raw: Array<{ role: 'user' | 'assistant'; content: string }> = [];
    for (const m of history) {
      if (!m.content?.trim()) continue;
      const role = m.role === 'assistant' ? 'assistant' : 'user';
      raw.push({ role, content: m.content.trim() });
    }
    raw.push({ role: 'user', content: prompt.trim() });

    // Anthropic requires the first message to be user
    while (raw.length > 0 && raw[0].role !== 'user') {
      raw.shift();
    }
    if (raw.length === 0) {
      raw.push({ role: 'user', content: prompt.trim() });
    }

    // Merge consecutive messages with the same role
    const merged: Array<{ role: 'user' | 'assistant'; content: string }> = [];
    for (const item of raw) {
      if (merged.length > 0 && merged[merged.length - 1].role === item.role) {
        merged[merged.length - 1].content += `\n\n${item.content}`;
      } else {
        merged.push({ role: item.role, content: item.content });
      }
    }

    return merged;
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
      model: res.model,
    };
  }

  // ==========================================
  // Gemini (Google AI API)
  // ==========================================
  private async chatWithGemini(req: AIChatRequest, apiKey: string, model: string): Promise<AIChatResponse> {
    const systemPrompt = this.buildSystemPrompt(req.context);
    const contents = this.sanitizeGeminiContents(req.conversationHistory, req.prompt);

    // Auto-heal legacy or typo model
    let activeModel = model;
    if (activeModel === 'gemini-2.5-flash') {
      activeModel = 'gemini-2.0-flash';
    }

    let response = await this.callGeminiAPI(apiKey, activeModel, systemPrompt, contents);

    // Auto-fallback from 2.0-flash to 1.5-flash if 404/400
    if (!response.ok && (response.status === 404 || response.status === 400)) {
      const fallback = activeModel === 'gemini-2.0-flash' ? 'gemini-1.5-flash' : 'gemini-2.0-flash';
      const retryRes = await this.callGeminiAPI(apiKey, fallback, systemPrompt, contents);
      if (retryRes.ok) {
        response = retryRes;
        activeModel = fallback;
      }
    }

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
      model: activeModel,
    };
  }

  private async callGeminiAPI(apiKey: string, model: string, systemPrompt: string, contents: any[]) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    return await fetch(url, {
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
  }

  private sanitizeGeminiContents(history: ChatMessageItem[] = [], prompt: string) {
    const raw: Array<{ role: 'user' | 'model'; text: string }> = [];
    for (const m of history) {
      if (!m.content?.trim()) continue;
      const role = m.role === 'assistant' ? 'model' : 'user';
      raw.push({ role, text: m.content.trim() });
    }
    raw.push({ role: 'user', text: prompt.trim() });

    // First content must be user
    while (raw.length > 0 && raw[0].role !== 'user') {
      raw.shift();
    }
    if (raw.length === 0) {
      raw.push({ role: 'user', text: prompt.trim() });
    }

    // Merge consecutive messages with the same role
    const merged: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];
    for (const item of raw) {
      if (merged.length > 0 && merged[merged.length - 1].role === item.role) {
        merged[merged.length - 1].parts[0].text += `\n\n${item.text}`;
      } else {
        merged.push({ role: item.role, parts: [{ text: item.text }] });
      }
    }

    return merged;
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
      model: res.model,
    };
  }

  // ==========================================
  // OpenAI (GPT-4o / GPT-4o-mini)
  // ==========================================
  private async chatWithOpenAI(req: AIChatRequest, apiKey: string, model: string): Promise<AIChatResponse> {
    const systemPrompt = this.buildSystemPrompt(req.context);
    const messages = this.sanitizeOpenAIMessages(systemPrompt, req.conversationHistory, req.prompt);

    let activeModel = model;
    let response = await this.callOpenAIAPI(apiKey, activeModel, messages);

    // Auto-fallback if requested model is unavailable
    if (!response.ok && (response.status === 404 || response.status === 400)) {
      const fallback = activeModel === 'gpt-4o-mini' ? 'gpt-4o' : 'gpt-4o-mini';
      const retryRes = await this.callOpenAIAPI(apiKey, fallback, messages);
      if (retryRes.ok) {
        response = retryRes;
        activeModel = fallback;
      }
    }

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
      model: activeModel,
    };
  }

  private async callOpenAIAPI(apiKey: string, model: string, messages: any[]) {
    return await fetch('https://api.openai.com/v1/chat/completions', {
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
  }

  private sanitizeOpenAIMessages(systemPrompt: string, history: ChatMessageItem[] = [], prompt: string) {
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
    ];
    for (const m of history) {
      if (!m.content?.trim()) continue;
      messages.push({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content.trim(),
      });
    }
    messages.push({ role: 'user', content: prompt.trim() });
    return messages;
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
      model: res.model,
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
