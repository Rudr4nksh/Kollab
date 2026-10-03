import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Send, 
  Bot, 
  User, 
  Copy, 
  Check, 
  GitPullRequest, 
  Wand2, 
  Bug, 
  Zap, 
  FileCode,
  Key,
  Lock,
  Eye,
  EyeOff,
  Trash2,
  ShieldCheck
} from 'lucide-react';
import { sendAIChat } from '../../services/api.ts';
import { 
  getStoredAIConfig, 
  saveAIConfig, 
  clearAIConfig, 
  isAIConfigured, 
  maskApiKey,
  getProviderDisplayName,
  AIProvider,
  UserAIConfig
} from '../../services/aiKeyStore.ts';
import type { FileNode, AIProposal } from '../../types/index.ts';
import styles from './AIAssistantPanel.module.css';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  codeBlock?: {
    code: string;
    language: string;
  };
  timestamp: string;
}

interface AIAssistantPanelProps {
  activeFile: FileNode | null;
  files?: FileNode[];
  userName: string;
  onProposeCode: (proposal: AIProposal) => void;
}

export const AIAssistantPanel: React.FC<AIAssistantPanelProps> = ({
  activeFile,
  files: _files,
  userName,
  onProposeCode,
}) => {
  // Key configuration state
  const [config, setConfig] = useState<UserAIConfig | null>(() => getStoredAIConfig());
  const [isConfiguringKey, setIsConfiguringKey] = useState<boolean>(() => !isAIConfigured());
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>('claude');
  const [inputApiKey, setInputApiKey] = useState('');
  const [showKeyPassword, setShowKeyPassword] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);

  // Chat state
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Hello ${userName}! I am **Kollab AI**, your collaborative pair programmer.\n\nAsk me anything about your project, or select a quick action below to analyze your active code.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Handle saving API key
  const handleSaveKey = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputApiKey.trim();
    if (!trimmed) {
      setKeyError('Please enter a valid API key.');
      return;
    }

    if (selectedProvider === 'claude' && !trimmed.startsWith('sk-ant-')) {
      setKeyError('Anthropic Claude API keys typically begin with "sk-ant-".');
      return;
    }
    if (selectedProvider === 'openai' && !trimmed.startsWith('sk-')) {
      setKeyError('OpenAI API keys typically begin with "sk-".');
      return;
    }

    saveAIConfig(selectedProvider, trimmed);
    const updated = getStoredAIConfig();
    setConfig(updated);
    setIsConfiguringKey(false);
    setInputApiKey('');
    setKeyError(null);
  };

  // Handle clearing/removing key
  const handleRemoveKey = () => {
    clearAIConfig();
    setConfig(null);
    setIsConfiguringKey(true);
  };

  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSendPrompt = async (promptText?: string) => {
    const text = (promptText || input).trim();
    if (!text || isLoading) return;

    if (!config?.apiKey) {
      setIsConfiguringKey(true);
      return;
    }

    const userMsg: Message = {
      id: 'msg_' + Date.now(),
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const history = messages
        .filter((m) => m.id !== 'welcome')
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await sendAIChat({
        prompt: text,
        context: activeFile
          ? {
              activeFile: activeFile.path,
              language: activeFile.language,
              activeCode: activeFile.content || '',
            }
          : undefined,
        conversationHistory: history,
        userName,
      });

      const extractedCode = res.suggestedCode
        ? {
            code: res.suggestedCode,
            language: res.suggestedLanguage || activeFile?.language || 'javascript',
          }
        : undefined;

      const aiMsg: Message = {
        id: 'msg_ai_' + Date.now(),
        role: 'assistant',
        content: res.reply,
        codeBlock: extractedCode,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: 'msg_err_' + Date.now(),
          role: 'assistant',
          content: `⚠️ Failed to get AI response: ${err.message || 'Please check your API key in settings.'}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendPrompt();
    }
  };

  const handleReviewAndApply = (codeToApply: string) => {
    if (!activeFile) return;
    const proposal: AIProposal = {
      id: 'prop_' + Date.now(),
      filePath: activeFile.path,
      originalCode: activeFile.content || '',
      proposedCode: codeToApply,
      explanation: 'AI refactored code proposal.',
      requestedBy: userName,
      timestamp: Date.now(),
    };
    onProposeCode(proposal);
  };

  const handleQuickAction = async (action: 'explain' | 'bugs' | 'optimize') => {
    if (!activeFile) {
      setMessages((prev) => [
        ...prev,
        {
          id: 'no_file_' + Date.now(),
          role: 'assistant',
          content: 'Please open a file from the explorer first to run quick actions.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      return;
    }

    if (action === 'explain') {
      handleSendPrompt(`Explain what ${activeFile.name} does and break down its architecture.`);
    } else if (action === 'bugs') {
      handleSendPrompt(`Analyze ${activeFile.name} for potential bugs, edge cases, and performance pitfalls.`);
    } else if (action === 'optimize') {
      handleSendPrompt(`Optimize and refactor ${activeFile.name} for cleaner syntax, efficiency, and modern best practices.`);
    }
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <Sparkles size={14} className={styles.sparkleIcon} />
          <span>AI ASSISTANT</span>
        </div>

        <div className={styles.headerRight}>
          {config && (
            <div className={styles.providerBadge} title={`Connected to ${getProviderDisplayName(config.provider)}`}>
              <span className={styles.statusDot} />
              <span>{getProviderDisplayName(config.provider)}</span>
            </div>
          )}

          <button
            type="button"
            className={`${styles.settingsBtn} ${isConfiguringKey ? styles.settingsBtnActive : ''}`}
            onClick={() => setIsConfiguringKey(!isConfiguringKey)}
            title="Configure AI API Key"
          >
            <Key size={13} />
          </button>
        </div>
      </div>

      {/* 1. KEY CONFIGURATION VIEW (Shown if not configured or when user clicks Key icon) */}
      {isConfiguringKey ? (
        <div className={styles.keyConfigCard}>
          <div className={styles.keyConfigHeader}>
            <div className={styles.keyIconCircle}>
              <Lock size={16} className={styles.lockIcon} />
            </div>
            <div>
              <h4 className={styles.keyConfigTitle}>Connect Your API Key</h4>
              <p className={styles.keyConfigSubtitle}>
                Bring Your Own Key (BYOK) for private, full-power AI assistance.
              </p>
            </div>
          </div>

          {/* Security Guarantee Banner */}
          <div className={styles.securityBanner}>
            <ShieldCheck size={14} className={styles.shieldIcon} />
            <span>
              <strong>100% Private & Safe:</strong> Stored locally in your browser. Never shared with other room participants or saved to server disk.
            </span>
          </div>

          {/* Provider Selection Tabs */}
          <div className={styles.providerSelector}>
            <button
              type="button"
              className={`${styles.providerTab} ${selectedProvider === 'claude' ? styles.activeProviderTab : ''}`}
              onClick={() => { setSelectedProvider('claude'); setKeyError(null); }}
            >
              <span>Anthropic (Claude)</span>
            </button>
            <button
              type="button"
              className={`${styles.providerTab} ${selectedProvider === 'gemini' ? styles.activeProviderTab : ''}`}
              onClick={() => { setSelectedProvider('gemini'); setKeyError(null); }}
            >
              <span>Google Gemini</span>
            </button>
            <button
              type="button"
              className={`${styles.providerTab} ${selectedProvider === 'openai' ? styles.activeProviderTab : ''}`}
              onClick={() => { setSelectedProvider('openai'); setKeyError(null); }}
            >
              <span>OpenAI</span>
            </button>
          </div>

          {/* Active Key Status if already connected */}
          {config && (
            <div className={styles.activeKeyInfo}>
              <div className={styles.activeKeyRow}>
                <span>Current Key:</span>
                <code>{maskApiKey(config.apiKey)}</code>
              </div>
              <button
                type="button"
                className={styles.removeKeyBtn}
                onClick={handleRemoveKey}
                title="Remove API Key from this browser"
              >
                <Trash2 size={12} />
                <span>Disconnect Key</span>
              </button>
            </div>
          )}

          {/* Key Input Form */}
          <form onSubmit={handleSaveKey} className={styles.keyForm}>
            <label className={styles.keyLabel}>
              {selectedProvider === 'claude' && 'Claude API Key (sk-ant-...)'}
              {selectedProvider === 'gemini' && 'Google Gemini API Key (AIzaSy...)'}
              {selectedProvider === 'openai' && 'OpenAI API Key (sk-...)'}
            </label>

            <div className={styles.keyInputWrapper}>
              <input
                type={showKeyPassword ? 'text' : 'password'}
                className={styles.keyInput}
                placeholder={
                  selectedProvider === 'claude'
                    ? 'sk-ant-api03-...'
                    : selectedProvider === 'gemini'
                    ? 'AIzaSy...'
                    : 'sk-...'
                }
                value={inputApiKey}
                onChange={(e) => {
                  setInputApiKey(e.target.value);
                  setKeyError(null);
                }}
                autoFocus
              />
              <button
                type="button"
                className={styles.eyeBtn}
                onClick={() => setShowKeyPassword(!showKeyPassword)}
                title={showKeyPassword ? 'Hide key' : 'Show key'}
              >
                {showKeyPassword ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>

            {keyError && <p className={styles.keyErrorMessage}>{keyError}</p>}

            <div className={styles.keyLinks}>
              {selectedProvider === 'claude' && (
                <a
                  href="https://console.anthropic.com/settings/keys"
                  target="_blank"
                  rel="noreferrer"
                  className={styles.keyLink}
                >
                  <span>Get Anthropic key ↗</span>
                </a>
              )}
              {selectedProvider === 'gemini' && (
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className={styles.keyLink}
                >
                  <span>Get Google AI Studio key ↗</span>
                </a>
              )}
              {selectedProvider === 'openai' && (
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noreferrer"
                  className={styles.keyLink}
                >
                  <span>Get OpenAI key ↗</span>
                </a>
              )}
            </div>

            <div className={styles.keyFormActions}>
              {config && (
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => setIsConfiguringKey(false)}
                >
                  Cancel
                </button>
              )}
              <button type="submit" className={styles.saveKeyBtn}>
                <Check size={13} />
                <span>Save & Connect Key</span>
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* 2. CHAT & ASSISTANT VIEW (When Key is Configured) */
        <>
          {/* Active File Context Pill */}
          {activeFile ? (
            <div className={styles.contextPill} title={`Active Context: ${activeFile.path}`}>
              <FileCode size={12} className={styles.contextFileIcon} />
              <span className={styles.contextFilePath}>{activeFile.name}</span>
              <span className={styles.contextLang}>({activeFile.language || 'plaintext'})</span>
            </div>
          ) : (
            <div className={styles.noContextPill}>
              <span>No active file selected (global context)</span>
            </div>
          )}

          {/* Quick Action Chips */}
          <div className={styles.quickChips}>
            <button
              type="button"
              className={styles.chip}
              onClick={() => handleQuickAction('explain')}
              disabled={isLoading}
            >
              <Zap size={11} />
              <span>Explain</span>
            </button>
            <button
              type="button"
              className={styles.chip}
              onClick={() => handleQuickAction('bugs')}
              disabled={isLoading}
            >
              <Bug size={11} />
              <span>Find Bugs</span>
            </button>
            <button
              type="button"
              className={styles.chip}
              onClick={() => handleQuickAction('optimize')}
              disabled={isLoading}
            >
              <Wand2 size={11} />
              <span>Optimize</span>
            </button>
          </div>

          {/* Message Feed */}
          <div className={styles.messagesContainer}>
            {messages.map((m) => (
              <div
                key={m.id}
                className={`${styles.messageItem} ${m.role === 'user' ? styles.userMessage : styles.aiMessage}`}
              >
                <div className={styles.messageHeader}>
                  <div className={styles.avatar}>
                    {m.role === 'user' ? <User size={12} /> : <Bot size={12} />}
                  </div>
                  <span className={styles.author}>{m.role === 'user' ? userName : 'Kollab AI'}</span>
                  <span className={styles.timestamp}>{m.timestamp}</span>
                </div>

                <div className={styles.messageBody}>
                  <p className={styles.textContent}>{m.content}</p>

                  {m.codeBlock && (
                    <div className={styles.codeSnippetCard}>
                      <div className={styles.codeSnippetHeader}>
                        <span className={styles.codeLang}>{m.codeBlock.language}</span>
                        <div className={styles.codeActions}>
                          <button
                            type="button"
                            className={styles.codeActionBtn}
                            onClick={() => handleCopyCode(m.codeBlock!.code, m.id)}
                            title="Copy code"
                          >
                            {copiedId === m.id ? <Check size={12} /> : <Copy size={12} />}
                            <span>{copiedId === m.id ? 'Copied' : 'Copy'}</span>
                          </button>

                          {activeFile && (
                            <button
                              type="button"
                              className={`${styles.codeActionBtn} ${styles.applyActionBtn}`}
                              onClick={() => handleReviewAndApply(m.codeBlock!.code)}
                              title="Review changes before applying to file"
                            >
                              <GitPullRequest size={12} />
                              <span>Review & Apply</span>
                            </button>
                          )}
                        </div>
                      </div>
                      <pre className={styles.preCode}>
                        <code>{m.codeBlock.code}</code>
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className={`${styles.messageItem} ${styles.aiMessage}`}>
                <div className={styles.messageHeader}>
                  <div className={styles.avatar}>
                    <Bot size={12} />
                  </div>
                  <span className={styles.author}>Kollab AI</span>
                </div>
                <div className={styles.thinkingPill}>
                  <Sparkles size={12} className={styles.pulsingSparkle} />
                  <span>Thinking & generating solution...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <form onSubmit={(e) => { e.preventDefault(); handleSendPrompt(); }} className={styles.inputArea}>
            <div className={styles.inputWrapper}>
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={activeFile ? `Ask AI about ${activeFile.name}...` : 'Ask Kollab AI anything...'}
                className={styles.textarea}
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className={styles.sendButton}
                title="Send (Enter)"
              >
                <Send size={13} />
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
};
