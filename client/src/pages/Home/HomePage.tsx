import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  ArrowRight, 
  Shield, 
  User, 
  Clock, 
  FolderPlus, 
  Terminal, 
  Users, 
  FileCode,
  Sparkles
} from 'lucide-react';
import { Input } from '../../components/UI/Input.tsx';
import { Button } from '../../components/UI/Button.tsx';
import styles from './HomePage.module.css';

interface RecentRoom {
  roomId: string;
  name: string;
  timestamp: number;
}

interface HomePageProps {
  onJoin: (roomId: string, name: string, passcode?: string) => Promise<void>;
  onCreate: (name: string, customRoomId?: string, passcode?: string, template?: string) => Promise<void>;
  error?: string | null;
  isLoading?: boolean;
}

export const HomePage: React.FC<HomePageProps> = ({
  onJoin,
  onCreate,
  error,
  isLoading,
}) => {
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [displayName, setDisplayName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [passcode, setPasscode] = useState('');
  const [template, setTemplate] = useState<'web' | 'python' | 'dart' | 'blank'>('web');
  const [recentRooms, setRecentRooms] = useState<RecentRoom[]>([]);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('kollab_recent_workspaces');
      if (stored) {
        setRecentRooms(JSON.parse(stored).slice(0, 5));
      }
    } catch {
      // ignore
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    const name = displayName.trim();
    if (!name) {
      setLocalError('Please enter your name to identify yourself in the workspace');
      return;
    }

    if (tab === 'join') {
      const targetRoom = roomId.trim();
      if (!targetRoom) {
        setLocalError('Please enter the Room ID to join');
        return;
      }
      await onJoin(targetRoom, name, passcode.trim() || undefined);
    } else {
      await onCreate(name, roomId.trim() || undefined, passcode.trim() || undefined, template);
    }
  };

  const handleRejoin = (recent: RecentRoom) => {
    setTab('join');
    setRoomId(recent.roomId);
    if (!displayName) {
      setDisplayName(recent.name);
    }
  };

  const activeError = error || localError;

  return (
    <div className={styles.homeContainer}>
      {/* Top Navigation */}
      <header className={styles.navbar}>
        <div className={styles.brand}>
          <div className={styles.brandBadge}>
            <span>&lt;&nbsp;/&nbsp;&gt;</span>
          </div>
          <span className={styles.brandTitle}>Kollab</span>
          <span className={styles.versionTag}>v1.0</span>
        </div>
        <div className={styles.navLinks}>
          <span className={styles.badgeFree}>100% Free &amp; Open Source</span>
        </div>
      </header>

      {/* Main Hero & Workspace Launcher */}
      <main className={styles.mainContent}>
        <div className={styles.heroSection}>
          <h1 className={styles.heroTitle}>
            Live Collaborative Workspace <br />
            <span className={styles.heroAccent}>for Student Developers</span>
          </h1>
          <p className={styles.heroSubtitle}>
            A real-time multi-file code pad with dark slate IDE aesthetics, live cursors, 
            terminal output, and zero setup.
          </p>

          {/* Quick Workspace Card */}
          <div className={styles.launcherCard}>
            <div className={styles.cardTabs}>
              <button
                className={`${styles.tabBtn} ${tab === 'create' ? styles.activeTab : ''}`}
                onClick={() => { setTab('create'); setLocalError(null); }}
              >
                <Plus size={14} />
                <span>Create Workspace</span>
              </button>
              <button
                className={`${styles.tabBtn} ${tab === 'join' ? styles.activeTab : ''}`}
                onClick={() => { setTab('join'); setLocalError(null); }}
              >
                <ArrowRight size={14} />
                <span>Join Session</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className={styles.form}>
              {activeError && (
                <div className={styles.errorBox}>
                  <span>{activeError}</span>
                </div>
              )}

              <div className={styles.inputGroup}>
                <Input
                  label="Your Display Name"
                  placeholder="e.g. Alex"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  leftIcon={<User size={14} />}
                  required
                  autoFocus
                />

                <Input
                  label={tab === 'join' ? 'Room ID' : 'Room ID (optional)'}
                  placeholder={tab === 'join' ? 'e.g. room-7F4K2 or demo123' : 'Leave empty for auto-generated ID'}
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  required={tab === 'join'}
                />

                <Input
                  label={tab === 'join' ? 'Passcode (if required)' : 'Passcode (optional)'}
                  type="password"
                  placeholder="Leave empty if public"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  leftIcon={<Shield size={14} />}
                />
              </div>

              {tab === 'create' && (
                <div className={styles.templateSelection}>
                  <label className={styles.templateLabel}>Starter Project Template</label>
                  <div className={styles.templateGrid}>
                    <button
                      type="button"
                      className={`${styles.templateBtn} ${template === 'web' ? styles.activeTemplate : ''}`}
                      onClick={() => setTemplate('web')}
                    >
                      <FileCode size={14} className={styles.templateIcon} />
                      <div className={styles.templateText}>
                        <span className={styles.templateName}>Web App</span>
                        <span className={styles.templateDesc}>HTML + CSS + JS</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      className={`${styles.templateBtn} ${template === 'python' ? styles.activeTemplate : ''}`}
                      onClick={() => setTemplate('python')}
                    >
                      <Terminal size={14} className={styles.templateIcon} />
                      <div className={styles.templateText}>
                        <span className={styles.templateName}>Python</span>
                        <span className={styles.templateDesc}>main.py + scripts</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      className={`${styles.templateBtn} ${template === 'dart' ? styles.activeTemplate : ''}`}
                      onClick={() => setTemplate('dart')}
                    >
                      <Sparkles size={14} className={styles.templateIcon} />
                      <div className={styles.templateText}>
                        <span className={styles.templateName}>Ceditor Demo</span>
                        <span className={styles.templateDesc}>Flutter / Dart demo</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      className={`${styles.templateBtn} ${template === 'blank' ? styles.activeTemplate : ''}`}
                      onClick={() => setTemplate('blank')}
                    >
                      <FolderPlus size={14} className={styles.templateIcon} />
                      <div className={styles.templateText}>
                        <span className={styles.templateName}>Blank</span>
                        <span className={styles.templateDesc}>Empty workspace</span>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isLoading}
                className={styles.submitBtn}
                icon={tab === 'create' ? <Plus size={15} /> : <ArrowRight size={15} />}
              >
                {tab === 'create' ? 'Launch Workspace' : 'Join Workspace'}
              </Button>
            </form>
          </div>
        </div>

        {/* Recent Workspaces Section */}
        {recentRooms.length > 0 && (
          <div className={styles.recentSection}>
            <div className={styles.recentHeader}>
              <Clock size={14} />
              <span>Recent Workspaces</span>
            </div>
            <div className={styles.recentList}>
              {recentRooms.map((r) => (
                <div key={r.roomId} className={styles.recentItem}>
                  <div className={styles.recentInfo}>
                    <span className={styles.recentRoomId}>{r.roomId}</span>
                    <span className={styles.recentName}>as {r.name}</span>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleRejoin(r)}
                  >
                    Rejoin
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Developer Features Strip */}
        <div className={styles.featuresGrid}>
          <div className={styles.featureItem}>
            <div className={styles.featureIcon}>
              <FileCode size={18} />
            </div>
            <h3>Multi-File Tree Explorer</h3>
            <p>Manage project files, create folders, and import local project directories seamlessly.</p>
          </div>

          <div className={styles.featureItem}>
            <div className={styles.featureIcon}>
              <Users size={18} />
            </div>
            <h3>Real-Time Live Presence</h3>
            <p>Simultaneous typing, remote cursors with line highlights, and automatic host handover.</p>
          </div>

          <div className={styles.featureItem}>
            <div className={styles.featureIcon}>
              <Terminal size={18} />
            </div>
            <h3>Live Console &amp; Output</h3>
            <p>Execute JavaScript and view execution stdout, stderr, and logs inside an integrated console.</p>
          </div>
        </div>
      </main>
    </div>
  );
};
