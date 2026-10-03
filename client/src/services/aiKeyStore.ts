/**
 * Secure Client-Side AI Key Store (BYOK - Bring Your Own Key)
 * 
 * Security Guarantees:
 * 1. Stored exclusively in the user's browser localStorage.
 * 2. NEVER broadcasted to other room participants via WebSockets or Yjs.
 * 3. NEVER stored in the room database or server disk.
 * 4. Transmitted only over HTTPS headers directly for your own AI requests.
 */

export type AIProvider = 'claude' | 'gemini' | 'openai';

export interface UserAIConfig {
  provider: AIProvider;
  apiKey: string;
  model?: string;
  savedAt: number;
}

const STORAGE_KEY = 'kollab_user_ai_config';

// Immediate self-heal on evaluation to sanitize any legacy model strings
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    const rawInit = localStorage.getItem(STORAGE_KEY);
    if (rawInit) {
      const parsedInit = JSON.parse(rawInit);
      if (parsedInit?.provider === 'gemini' && (parsedInit?.model?.includes('2.5') || parsedInit?.model?.includes('1.5') || !parsedInit?.model)) {
        parsedInit.model = 'gemini-3.8-flash';
        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsedInit));
      }
    }
  }
} catch {}

export function getStoredAIConfig(): UserAIConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.apiKey || !parsed.provider) return null;

    // Auto-heal legacy or retired model names
    if (parsed.provider === 'gemini' && (parsed.model?.includes('2.5') || parsed.model?.includes('1.5') || !parsed.model)) {
      parsed.model = 'gemini-3.8-flash';
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    }

    return parsed as UserAIConfig;
  } catch {
    return null;
  }
}

export function saveAIConfig(provider: AIProvider, apiKey: string, model?: string): void {
  const cleanKey = apiKey.trim();
  const config: UserAIConfig = {
    provider,
    apiKey: cleanKey,
    model: model || getDefaultModelForProvider(provider),
    savedAt: Date.now(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function clearAIConfig(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function isAIConfigured(): boolean {
  const config = getStoredAIConfig();
  return Boolean(config && config.apiKey.length > 5);
}

export function getDefaultModelForProvider(provider: AIProvider): string {
  switch (provider) {
    case 'claude':
      return 'claude-3-5-sonnet-20241022';
    case 'gemini':
      return 'gemini-3.8-flash';
    case 'openai':
      return 'gpt-4o-mini';
    default:
      return 'claude-3-5-sonnet-20241022';
  }
}

export function getProviderDisplayName(provider: AIProvider): string {
  switch (provider) {
    case 'claude':
      return 'Anthropic Claude';
    case 'gemini':
      return 'Google Gemini';
    case 'openai':
      return 'OpenAI';
    default:
      return 'AI Provider';
  }
}

export function maskApiKey(key: string): string {
  if (!key || key.length < 8) return '••••••••';
  const prefix = key.slice(0, 7);
  const suffix = key.slice(-4);
  return `${prefix}••••••••${suffix}`;
}
