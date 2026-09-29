import React, { useState } from 'react';
import { TopBar } from '../../components/TopBar/TopBar.tsx';
import { CodeEditor } from '../../components/Editor/CodeEditor.tsx';
import { ParticipantList } from '../../components/Participants/ParticipantList.tsx';
import { ActivityFeed } from '../../components/ActivityFeed/ActivityFeed.tsx';
import { RoomSettingsModal } from '../../components/RoomJoin/RoomSettingsModal.tsx';
import { ToastContainer, ToastMessage } from '../../components/UI/Toast.tsx';
import type { 
  SupportedLanguage, 
  Participant, 
  ActivityEvent, 
  ConnectionState 
} from '../../types/index.ts';
import { Code2, Users, Activity } from 'lucide-react';
import styles from './WorkspacePage.module.css';

interface WorkspacePageProps {
  roomId: string;
  userId: string;
  displayName: string;
  isHost: boolean;
  hasPasscode?: boolean;
  connectionState: ConnectionState;
  participants: Participant[];
  activities: ActivityEvent[];
  initialContent?: string;
  initialLanguage?: SupportedLanguage;
  onContentChange?: (val: string) => void;
  onLanguageChange?: (lang: SupportedLanguage) => void;
  onCursorChange?: (line: number, column: number) => void;
  onLeaveRoom: () => void;
  toasts: ToastMessage[];
  onDismissToast: (id: string) => void;
}

export const WorkspacePage: React.FC<WorkspacePageProps> = ({
  roomId,
  userId,
  isHost,
  hasPasscode,
  connectionState,
  participants,
  activities,
  initialContent = '',
  initialLanguage = 'html',
  onContentChange,
  onLanguageChange,
  onCursorChange,
  onLeaveRoom,
  toasts,
  onDismissToast,
}) => {
  const [language, setLanguage] = useState<SupportedLanguage>(initialLanguage);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<'editor' | 'people' | 'activity'>('editor');

  const handleLanguageSelect = (newLang: SupportedLanguage) => {
    setLanguage(newLang);
    if (onLanguageChange) {
      onLanguageChange(newLang);
    }
  };

  return (
    <div className={styles.workspace}>
      <TopBar
        roomId={roomId}
        isHost={isHost}
        participantCount={participants.length}
        connectionState={connectionState}
        hasPasscode={hasPasscode}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onLeaveRoom={onLeaveRoom}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        isSidebarOpen={isSidebarOpen}
      />

      {/* Mobile Tab Navigation */}
      <div className={styles.mobileNav}>
        <button
          className={`${styles.mobileTab} ${mobileTab === 'editor' ? styles.activeTab : ''}`}
          onClick={() => setMobileTab('editor')}
        >
          <Code2 size={14} />
          <span>Editor</span>
        </button>
        <button
          className={`${styles.mobileTab} ${mobileTab === 'people' ? styles.activeTab : ''}`}
          onClick={() => setMobileTab('people')}
        >
          <Users size={14} />
          <span>People ({participants.length})</span>
        </button>
        <button
          className={`${styles.mobileTab} ${mobileTab === 'activity' ? styles.activeTab : ''}`}
          onClick={() => setMobileTab('activity')}
        >
          <Activity size={14} />
          <span>Activity</span>
        </button>
      </div>

      <div className={styles.mainLayout}>
        {/* Editor Area (Dominates screen) */}
        <main
          className={`${styles.editorArea} ${
            mobileTab !== 'editor' ? styles.mobileHidden : ''
          }`}
        >
          <CodeEditor
            value={initialContent}
            language={language}
            onLanguageChange={handleLanguageSelect}
            onContentChange={onContentChange}
            onCursorChange={onCursorChange}
            participants={participants}
            currentUserId={userId}
          />
        </main>

        {/* Sidebar with Participants and Activity Feed */}
        <aside
          className={`${styles.sidebar} ${!isSidebarOpen ? styles.sidebarClosed : ''} ${
            mobileTab === 'editor' ? styles.mobileHiddenAside : ''
          }`}
        >
          <div
            className={`${styles.panelSection} ${
              mobileTab === 'activity' ? styles.mobileHidden : ''
            }`}
          >
            <ParticipantList
              participants={participants}
              currentUserId={userId}
            />
          </div>

          <div
            className={`${styles.panelSection} ${styles.activitySection} ${
              mobileTab === 'people' ? styles.mobileHidden : ''
            }`}
          >
            <ActivityFeed activities={activities} />
          </div>
        </aside>
      </div>

      <RoomSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        roomId={roomId}
        isHost={isHost}
        hasPasscode={hasPasscode}
      />

      <ToastContainer toasts={toasts} onDismiss={onDismissToast} />
    </div>
  );
};
