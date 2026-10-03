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
  ChevronLeft,
  ShieldCheck
} from 'lucide-react';
import { sendAIChat } from '../../services/api.ts';
import { 
  getStoredAIConfig, 
  saveAIConfig, 
  clearAIConfig, 
  isAIConfigured, 
  maskApiKey,
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
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>(() => {
    const saved = getStoredAIConfig();
    return saved?.provider || 'claude';
  });
  const [inputApiKey, setInputApiKey] = useState('');
  const [showKeyPassword, setShowKeyPassword] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);

  // Chat state
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Hello ${userName}! I am your collaborative AI assistant.\nAsk questions about your code, generate algorithms, or review active files.`,
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

  const handleSaveKey = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputApiKey.trim();
    if (!trimmed) {
      setKeyError('Please enter a valid API key.');
      return;
    }

    if (selectedProvider === 'claude' && !trimmed.startsWith('sk-ant-')) {
      setKeyError('Claude keys usually start with "sk-ant-".');
      return;
    }
    if (selectedProvider === 'openai' && !trimmed.startsWith('sk-')) {
      setKeyError('OpenAI keys usually start with "sk-".');
      return;
    }

    saveAIConfig(selectedProvider, trimmed);
    const updated = getStoredAIConfig();
    setConfig(updated);
    setIsConfiguringKey(false);
    setInputApiKey('');
    setKeyError(null);
  };

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
          content: `⚠️ ${err.message || 'Error communicating with AI. Please verify your API key.'}`,
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
      explanation: 'AI suggested code modification.',
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
          content: 'Open a file in the editor to run contextual actions.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      return;
    }

    if (action === 'explain') {
      handleSendPrompt(`Explain what ${activeFile.name} does and summarize its key functions.`);
    } else if (action === 'bugs') {
      handleSendPrompt(`Review ${activeFile.name} for subtle bugs, unhandled errors, and edge cases.`);
    } else if (action === 'optimize') {
      handleSendPrompt(`Optimize and refactor ${activeFile.name} for clean modern syntax and performance.`);
    }
  };

  const providerLabel = config?.provider === 'claude' 
    ? 'Claude' 
    : config?.provider === 'gemini' 
    ? 'Gemini' 
    : 'OpenAI';

  return (
    <div className={styles.container}>
      {/* 1. Header Matching FileExplorer Header Design */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Sparkles size={13} className={styles.headerIcon} />
          <span className={styles.headerTitle}>AI ASSISTANT</span>
        </div>

        <div className={styles.headerActions}>
          {config && !isConfiguringKey && (
            <span className={styles.activePill} title={`Connected via ${providerLabel}`}>
              <span className={styles.activeDot} />
              <span>{providerLabel}</span>
            </span>
          )}

          <button
            type="button"
            className={`${styles.iconBtn} ${isConfiguringKey ? styles.iconBtnActive : ''}`}
            onClick={() => setIsConfiguringKey(!isConfiguringKey)}
            title={isConfiguringKey ? "Back to Chat" : "API Key Settings"}
          >
            <Key size={13} />
          </button>
        </div>
      </div>

      {/* 2. Sleek, Spacious BYOK Setup View */}
      {isConfiguringKey ? (
        <div className={styles.setupCard}>
          <div className={styles.setupHero}>
            <div className={styles.heroBadge}>
              <Key size={16} className={styles.heroIcon} />
            </div>
            <div className={styles.heroContent}>
              <div className={styles.setupTitleRow}>
                {config && (
                  <button
                    type="button"
                    className={styles.backBtn}
                    onClick={() => setIsConfiguringKey(false)}
                    title="Back to chat"
                  >
                    <ChevronLeft size={16} />
                  </button>
                )}
                <h3 className={styles.setupHeading}>Connect API Key</h3>
              </div>
              <p className={styles.setupDesc}>
                Bring your own key for private, full-power AI assistance. Stored locally in your browser.
              </p>
            </div>
          </div>

          {/* Clean Segmented Provider Control */}
          <div className={styles.controlGroup}>
            <label className={styles.groupLabel}>Select Provider</label>
            <div className={styles.segmentedControl}>
              <button
                type="button"
                className={`${styles.segmentBtn} ${selectedProvider === 'claude' ? styles.segmentActive : ''}`}
                onClick={() => { setSelectedProvider('claude'); setKeyError(null); }}
              >
                Claude
              </button>
              <button
                type="button"
                className={`${styles.segmentBtn} ${selectedProvider === 'gemini' ? styles.segmentActive : ''}`}
                onClick={() => { setSelectedProvider('gemini'); setKeyError(null); }}
              >
                Gemini
              </button>
              <button
                type="button"
                className={`${styles.segmentBtn} ${selectedProvider === 'openai' ? styles.segmentActive : ''}`}
                onClick={() => { setSelectedProvider('openai'); setKeyError(null); }}
              >
                OpenAI
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSaveKey} className={styles.form}>
            <div className={styles.formGroup}>
              <div className={styles.labelRow}>
                <label className={styles.fieldLabel}>
                  {selectedProvider === 'claude' && 'Anthropic API Key'}
                  {selectedProvider === 'gemini' && 'Google Gemini API Key'}
                  {selectedProvider === 'openai' && 'OpenAI API Key'}
                </label>
                {selectedProvider === 'claude' && (
                  <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer" className={styles.fieldLink}>
                    Get key ↗
                  </a>
                )}
                {selectedProvider === 'gemini' && (
                  <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className={styles.fieldLink}>
                    Get key ↗
                  </a>
                )}
                {selectedProvider === 'openai' && (
                  <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" className={styles.fieldLink}>
                    Get key ↗
                  </a>
                )}
              </div>

              <div className={styles.inputBox}>
                <input
                  type={showKeyPassword ? 'text' : 'password'}
                  className={styles.inputField}
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
                  title={showKeyPassword ? "Hide" : "Show"}
                >
                  {showKeyPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>

              {keyError && <span className={styles.errorText}>{keyError}</span>}
            </div>

            <button type="submit" className={styles.submitBtn}>
              <Check size={14} />
              <span>Save & Connect Key</span>
            </button>
          </form>

          {/* Existing Connected Key (if any) */}
          {config && (
            <div className={styles.connectedSection}>
              <div className={styles.connectedRow}>
                <div className={styles.connectedInfo}>
                  <span className={styles.connectedLabel}>Current Key</span>
                  <code className={styles.connectedKey}>{maskApiKey(config.apiKey)}</code>
                </div>
                <button
                  type="button"
                  className={styles.disconnectBtn}
                  onClick={handleRemoveKey}
                  title="Remove Key"
                >
                  <Trash2 size={12} />
                  <span>Disconnect</span>
                </button>
              </div>
            </div>
          )}

          {/* Privacy & Isolation Benefits */}
          <div className={styles.benefitsCard}>
            <div className={styles.benefitItem}>
              <Lock size={13} className={styles.benefitIcon} />
              <span><strong>Client-Side Vault:</strong> Key never leaves your browser.</span>
            </div>
            <div className={styles.benefitItem}>
              <ShieldCheck size={13} className={styles.benefitIcon} />
              <span><strong>Room Isolation:</strong> Peers cannot see or use your quota.</span>
            </div>
          </div>
        </div>
      ) : (
        /* 3. Sleek Chat & Pair Programming View */
        <div className={styles.chatView}>
          {/* Active File Context */}
          {activeFile && (
            <div className={styles.contextBar} title={`Context: ${activeFile.path}`}>
              <FileCode size={12} className={styles.contextIcon} />
              <span className={styles.contextName}>{activeFile.name}</span>
              <span className={styles.contextLang}>({activeFile.language || 'code'})</span>
            </div>
          )}

          {/* Quick Actions */}
          <div className={styles.actionChips}>
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

          {/* Message Stream */}
          <div className={styles.messagesList}>
            {messages.map((m) => (
              <div
                key={m.id}
                className={`${styles.message} ${m.role === 'user' ? styles.userMsg : styles.aiMsg}`}
              >
                <div className={styles.msgHeader}>
                  <div className={styles.msgAvatar}>
                    {m.role === 'user' ? <User size={11} /> : <Bot size={11} />}
                  </div>
                  <span className={styles.msgAuthor}>{m.role === 'user' ? userName : 'AI'}</span>
                  <span className={styles.msgTime}>{m.timestamp}</span>
                </div>

                <div className={styles.msgBody}>
                  <p className={styles.msgText}>{m.content}</p>

                  {m.codeBlock && (
                    <div className={styles.codeSnippet}>
                      <div className={styles.snippetHeader}>
                        <span className={styles.snippetLang}>{m.codeBlock.language}</span>
                        <div className={styles.snippetActions}>
                          <button
                            type="button"
                            className={styles.snippetBtn}
                            onClick={() => handleCopyCode(m.codeBlock!.code, m.id)}
                            title="Copy code"
                          >
                            {copiedId === m.id ? <Check size={11} /> : <Copy size={11} />}
                            <span>{copiedId === m.id ? 'Copied' : 'Copy'}</span>
                          </button>

                          {activeFile && (
                            <button
                              type="button"
                              className={`${styles.snippetBtn} ${styles.applyBtn}`}
                              onClick={() => handleReviewAndApply(m.codeBlock!.code)}
                              title="Review changes before applying"
                            >
                              <GitPullRequest size={11} />
                              <span>Apply</span>
                            </button>
                          )}
                        </div>
                      </div>
                      <pre className={styles.snippetPre}>
                        <code>{m.codeBlock.code}</code>
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className={`${styles.message} ${styles.aiMsg}`}>
                <div className={styles.msgHeader}>
                  <div className={styles.msgAvatar}>
                    <Bot size={11} />
                  </div>
                  <span className={styles.msgAuthor}>AI</span>
                </div>
                <div className={styles.thinking}>
                  <Sparkles size={12} className={styles.thinkingIcon} />
                  <span>Thinking...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Clean Input Prompt */}
          <form onSubmit={(e) => { e.preventDefault(); handleSendPrompt(); }} className={styles.inputContainer}>
            <div className={styles.inputPill}>
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={activeFile ? `Ask about ${activeFile.name}...` : 'Ask anything...'}
                className={styles.chatInput}
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className={styles.sendBtn}
                title="Send"
              >
                <Send size={12} />
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
