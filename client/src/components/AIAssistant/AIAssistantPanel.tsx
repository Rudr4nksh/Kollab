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
  FileCode
} from 'lucide-react';
import { sendAIChat, getAIStatus } from '../../services/api.ts';
import type { FileNode, AIProposal, AIProviderStatus } from '../../types/index.ts';
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
  const [providerStatus, setProviderStatus] = useState<AIProviderStatus | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    getAIStatus()
      .then((status) => setProviderStatus(status))
      .catch(() => {});
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSendPrompt = async (promptText?: string) => {
    const text = (promptText || input).trim();
    if (!text || isLoading) return;

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
          content: `⚠️ Failed to get AI response: ${err.message || 'Please try again.'}`,
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

        <div className={styles.providerBadge} title={providerStatus?.model || 'AI Model'}>
          <span className={styles.statusDot} />
          <span>{providerStatus?.displayName || 'Kollab AI'}</span>
        </div>
      </div>

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
              <span>Analyzing & generating solution...</span>
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
    </div>
  );
};
