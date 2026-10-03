import React, { useState, useEffect, useRef } from 'react';
import { 
  Volume2, 
  Mic, 
  MicOff, 
  Headphones, 
  VolumeX, 
  PhoneOff, 
  Send, 
  X,
  Code,
  MessageSquare
} from 'lucide-react';
import type { ChatMessage, VoiceParticipant, Participant } from '../../types/index.ts';
import { voiceService } from '../../services/voiceService.ts';
import { isAIConfigured, getStoredAIConfig } from '../../services/aiKeyStore.ts';
import { sendAIChat } from '../../services/api.ts';
import styles from './DiscordPanel.module.css';

interface DiscordPanelProps {
  roomId: string;
  userId: string;
  displayName: string;
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  voiceUsers: VoiceParticipant[];
  participants: Participant[];
  onClose?: () => void;
}

export const DiscordPanel: React.FC<DiscordPanelProps> = ({
  roomId,
  userId,
  displayName,
  messages,
  onSendMessage,
  voiceUsers,
  participants,
  onClose,
}) => {
  const [inputText, setInputText] = useState('');
  const [isVoiceConnected, setIsVoiceConnected] = useState(voiceService.isConnected);
  const [isMuted, setIsMuted] = useState(voiceService.isMuted);
  const [isDeafened, setIsDeafened] = useState(voiceService.isDeafened);
  const [isSpeakingLocally, setIsSpeakingLocally] = useState(voiceService.isSpeaking);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Sync voice service state changes
  useEffect(() => {
    const unsubState = voiceService.onStateChange(() => {
      setIsVoiceConnected(voiceService.isConnected);
      setIsMuted(voiceService.isMuted);
      setIsDeafened(voiceService.isDeafened);
      setIsSpeakingLocally(voiceService.isSpeaking);
    });

    const unsubSpeaking = voiceService.onSpeaking((speaking) => {
      setIsSpeakingLocally(speaking);
    });

    return () => {
      unsubState();
      unsubSpeaking();
    };
  }, []);

  // Sync peer connections when voiceUsers list changes
  useEffect(() => {
    if (voiceService.isConnected) {
      voiceService.syncPeers(voiceUsers.map((u) => u.userId));
    }
  }, [voiceUsers, isVoiceConnected]);

  // Auto-scroll chat to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleJoinVoice = async () => {
    await voiceService.joinVoice(roomId, userId);
  };

  const handleLeaveVoice = () => {
    voiceService.leaveVoice();
  };

  const handleToggleMute = () => {
    voiceService.toggleMute();
  };

  const handleToggleDeafen = () => {
    voiceService.toggleDeafen();
  };

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed) return;
    onSendMessage(trimmed);
    setInputText('');
    inputRef.current?.focus();

    // Collaborative @ai trigger (Client-side BYOK)
    if (trimmed.toLowerCase().startsWith('@ai')) {
      const prompt = trimmed.replace(/^@ai\s*/i, '').trim();
      if (!prompt) return;

      if (!isAIConfigured()) {
        setTimeout(() => {
          onSendMessage('⚠️ To use @ai, please connect your Claude, Gemini, or OpenAI API key in the AI Assistant (✦) panel on the left.');
        }, 300);
        return;
      }

      sendAIChat({ prompt, userName: displayName })
        .then((res) => {
          const cfg = getStoredAIConfig();
          const providerName = cfg?.provider === 'claude' ? 'Claude' : cfg?.provider === 'gemini' ? 'Gemini' : 'OpenAI';
          onSendMessage(`✦ [Kollab AI (${providerName})]:\n${res.reply}`);
        })
        .catch((err) => {
          onSendMessage(`⚠️ AI Error: ${err.message || 'Failed to generate response'}`);
        });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Automatically wrap code or toggle code formatting
  const handleToggleWrapCode = () => {
    const trimmed = inputText.trim();
    if (!trimmed) {
      setInputText('```\n\n```');
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.selectionStart = 4;
          inputRef.current.selectionEnd = 4;
        }
      }, 0);
      return;
    }

    if (trimmed.startsWith('```') && trimmed.endsWith('```')) {
      // Unwrap if already wrapped
      const unwrapped = trimmed.replace(/^```[a-z]*\n?([\s\S]*?)\n?```$/i, '$1').trim();
      setInputText(unwrapped);
    } else {
      // Automatically wrap whatever code is in the box
      setInputText(`\`\`\`\n${trimmed}\n\`\`\``);
    }
    inputRef.current?.focus();
  };

  // Automatically wrap pasted code
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const paste = e.clipboardData.getData('text');
    if (!paste) return;

    // Detect if pasted text looks like code (multi-line, indentation, or typical code syntax)
    const isMultiLine = paste.includes('\n') || paste.includes('\r');
    const isCodeSyntax = /^(const|let|var|function|import|export|class|def|for|while|if|return|public|private|#include|<html)\b|[{};=><()[\]]/m.test(paste);

    // If it's already wrapped in ```, let default paste happen
    if (paste.trim().startsWith('```') && paste.trim().endsWith('```')) {
      return;
    }

    if (isMultiLine || (paste.length > 25 && isCodeSyntax)) {
      e.preventDefault();
      const wrapped = `\`\`\`\n${paste.trim()}\n\`\`\``;
      const el = inputRef.current;
      if (el) {
        const start = el.selectionStart || 0;
        const end = el.selectionEnd || 0;
        const nextVal = inputText.substring(0, start) + wrapped + inputText.substring(end);
        setInputText(nextVal);
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.selectionStart = start + wrapped.length;
            inputRef.current.selectionEnd = start + wrapped.length;
          }
        }, 0);
      } else {
        setInputText((prev) => (prev ? `${prev}\n${wrapped}` : wrapped));
      }
    }
  };

  // Helper to get initials
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  // Helper to format time
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Format message text and detect code snippets
  const renderMessageContent = (text: string) => {
    const codeBlockRegex = /```([\s\S]*?)```/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(
          <span key={`text_${lastIndex}`}>
            {text.substring(lastIndex, match.index)}
          </span>
        );
      }
      parts.push(
        <pre key={`code_${match.index}`} className={styles.codeBubble}>
          <code>{match[1].trim()}</code>
        </pre>
      );
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      parts.push(
        <span key={`text_${lastIndex}`}>
          {text.substring(lastIndex)}
        </span>
      );
    }

    return parts.length > 0 ? parts : text;
  };

  const currentParticipant = participants.find((p) => p.id === userId);
  const myColor = currentParticipant?.color || '#5865F2';

  return (
    <aside className={styles.discordPanel}>
      {/* Header */}
      <div className={styles.panelHeader}>
        <div className={styles.channelTitleRow}>
          <MessageSquare size={16} className={styles.hashIcon} />
          <span className={styles.channelName}>Chat</span>
        </div>
        <div className={styles.headerActions}>
          {onClose && (
            <button
              className={styles.iconBtn}
              onClick={onClose}
              title="Close chat panel"
              aria-label="Close"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Voice Channel Section */}
      <div className={styles.voiceSection}>
        <div className={styles.voiceHeader}>
          <div className={styles.voiceTitleRow}>
            <Volume2 size={13} />
            <span>Voice Channel</span>
          </div>
          {isVoiceConnected ? (
            <span className={styles.voiceActiveBadge}>
              <span className={styles.voicePingDot} />
              Connected
            </span>
          ) : (
            voiceUsers.length > 0 && (
              <span className={styles.voiceActiveBadge}>
                {voiceUsers.length} in voice
              </span>
            )
          )}
        </div>

        {!isVoiceConnected ? (
          <button
            className={styles.joinVoiceBtn}
            onClick={handleJoinVoice}
            title="Connect your microphone and join voice channel"
          >
            <Mic size={14} />
            <span>Join Voice</span>
          </button>
        ) : (
          <button
            className={styles.disconnectVoiceBtn}
            onClick={handleLeaveVoice}
            title="Disconnect from voice"
          >
            <PhoneOff size={13} />
            <span>Disconnect</span>
          </button>
        )}

        {/* Connected Voice Members List */}
        {voiceUsers.length > 0 && (
          <div className={styles.voiceMembersList}>
            {voiceUsers.map((user) => {
              const isMe = user.userId === userId;
              const isSpeaking = isMe ? isSpeakingLocally : user.isSpeaking;
              const userMuted = isMe ? isMuted : user.isMuted;
              const userDeafened = isMe ? isDeafened : user.isDeafened;

              return (
                <div key={user.userId} className={styles.voiceMemberCard}>
                  <div className={styles.memberLeft}>
                    <div
                      className={`${styles.avatarWrap} ${
                        isSpeaking ? styles.speakingGlow : ''
                      }`}
                      style={{
                        width: 24,
                        height: 24,
                        backgroundColor: user.userColor || '#5865F2',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 10,
                        fontWeight: 700,
                        color: '#FFFFFF',
                      }}
                    >
                      {getInitials(user.userName)}
                    </div>
                    <span className={styles.memberName}>
                      {user.userName}
                      {isMe && <span className={styles.youTag}>(you)</span>}
                    </span>
                  </div>

                  <div className={styles.memberStatusIcons}>
                    {userMuted && (
                      <span title="Muted" style={{ display: 'inline-flex' }}>
                        <MicOff size={12} color="#ED4245" />
                      </span>
                    )}
                    {userDeafened && (
                      <span title="Deafened" style={{ display: 'inline-flex' }}>
                        <VolumeX size={12} color="#ED4245" />
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Chat Messages Feed */}
      <div className={styles.chatMessagesArea}>
        <div className={styles.welcomeChatBanner}>
          <div className={styles.welcomeIconCircle}>
            <MessageSquare size={22} />
          </div>
          <div className={styles.welcomeTitle}>Welcome to Chat!</div>
          <div className={styles.welcomeSubtext}>
            This is the start of the chat for room {roomId}. You can chat, share code snippets with ```code```, and speak with collaborators.
          </div>
        </div>

        {messages.map((msg) => (
          <div key={msg.id} className={styles.messageItem}>
            <div
              style={{
                width: 32,
                height: 32,
                minWidth: 32,
                borderRadius: '50%',
                backgroundColor: msg.userColor || '#5865F2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: 12,
              }}
            >
              {getInitials(msg.userName)}
            </div>
            <div className={styles.messageContent}>
              <div className={styles.messageMeta}>
                <span
                  className={styles.senderName}
                  style={{ color: msg.userColor || '#DBDEE1' }}
                >
                  {msg.userName}
                </span>
                <span className={styles.messageTime}>
                  {formatTime(msg.timestamp)}
                </span>
              </div>
              <div className={styles.messageText}>
                {renderMessageContent(msg.text)}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Box */}
      <div className={styles.chatInputWrapper}>
        <form onSubmit={handleSend} className={styles.inputCard}>
          <textarea
            ref={inputRef}
            rows={1}
            className={styles.textInput}
            placeholder="type to chat"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
          />
          <button
            type="button"
            className={`${styles.iconBtn} ${inputText.includes('```') ? styles.codeBtnActive : ''}`}
            onClick={handleToggleWrapCode}
            title={inputText.trim() ? "Automatically wrap code in ```" : "Insert Code Block (```)"}
          >
            <Code size={14} />
          </button>
          <button
            type="submit"
            className={styles.sendBtn}
            disabled={!inputText.trim()}
            title="Send Message"
          >
            <Send size={13} />
          </button>
        </form>
      </div>

      {/* Discord User Dock (Bottom bar) */}
      <div className={styles.userDock}>
        <div className={styles.userInfo}>
          <div
            className={`${styles.avatarWrap} ${
              isSpeakingLocally ? styles.speakingGlow : ''
            }`}
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              backgroundColor: myColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: 11,
            }}
          >
            {getInitials(displayName)}
          </div>
          <div className={styles.userNames}>
            <span className={styles.dockDisplayName}>{displayName}</span>
            <span className={styles.dockStatus}>
              {isVoiceConnected ? (isMuted ? 'Muted' : 'Voice Connected') : 'Online'}
            </span>
          </div>
        </div>

        <div className={styles.dockControls}>
          <button
            className={`${styles.dockIconBtn} ${
              isMuted ? styles.dockIconBtnActiveRed : ''
            }`}
            onClick={handleToggleMute}
            title={isMuted ? 'Unmute Mic' : 'Mute Mic'}
            disabled={!isVoiceConnected}
          >
            {isMuted ? <MicOff size={14} /> : <Mic size={14} />}
          </button>
          <button
            className={`${styles.dockIconBtn} ${
              isDeafened ? styles.dockIconBtnActiveRed : ''
            }`}
            onClick={handleToggleDeafen}
            title={isDeafened ? 'Undeafen Audio' : 'Deafen Audio'}
            disabled={!isVoiceConnected}
          >
            {isDeafened ? <VolumeX size={14} /> : <Headphones size={14} />}
          </button>
        </div>
      </div>
    </aside>
  );
};
