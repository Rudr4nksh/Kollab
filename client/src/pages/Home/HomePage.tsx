import React, { useState } from 'react';
import { 
  Plus, 
  ArrowRight, 
  Shield, 
  User, 
  FolderTree, 
  Terminal, 
  Users, 
  Play, 
  Sparkles,
  X
} from 'lucide-react';
import { Input } from '../../components/UI/Input.tsx';
import { Button } from '../../components/UI/Button.tsx';
import styles from './HomePage.module.css';

interface HomePageProps {
  onJoin: (roomId: string, name: string, passcode?: string) => Promise<void>;
  onCreate: (name: string, customRoomId?: string, passcode?: string) => Promise<void>;
  error?: string | null;
  isLoading?: boolean;
}

export const HomePage: React.FC<HomePageProps> = ({
  onJoin,
  onCreate,
  error,
  isLoading,
}) => {
  const [modalMode, setModalMode] = useState<'create' | 'join' | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [passcode, setPasscode] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleOpenModal = (mode: 'create' | 'join', initialRoomId: string = '') => {
    setModalMode(mode);
    setRoomId(initialRoomId);
    setLocalError(null);
  };

  const handleCloseModal = () => {
    setModalMode(null);
    setLocalError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    const name = displayName.trim();
    if (!name) {
      setLocalError('Please enter your name');
      return;
    }

    if (modalMode === 'join') {
      const targetRoom = roomId.trim();
      if (!targetRoom) {
        setLocalError('Please enter a Room ID');
        return;
      }
      await onJoin(targetRoom, name, passcode.trim() || undefined);
    } else {
      await onCreate(name, roomId.trim() || undefined, passcode.trim() || undefined);
    }
  };

  const activeError = error || localError;

  return (
    <div className={styles.landingPage}>
      {/* Top Navbar */}
      <nav className={styles.navBar}>
        <div className={styles.navBrand}>
          <div className={styles.brandIcon}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
              <line x1="14" y1="4" x2="10" y2="20" stroke="currentColor" strokeWidth="2" opacity="0.6" />
            </svg>
          </div>
          <span className={styles.brandTitle}>Kollab</span>
        </div>

        <div className={styles.navLinks}>
          <a href="#features">Features</a>
          <a href="#how-it-works">How It Works</a>
          <a 
            href="https://github.com/Rudr4nksh/Kollab" 
            target="_blank" 
            rel="noreferrer"
            className={styles.githubLink}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            <span>GitHub</span>
          </a>
        </div>

        <div className={styles.navActions}>
          <button 
            className={styles.navJoinBtn}
            onClick={() => handleOpenModal('join')}
          >
            Join Room
          </button>
          <button 
            className={styles.navCreateBtn}
            onClick={() => handleOpenModal('create')}
          >
            Launch Workspace
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className={styles.heroSection}>
        <div className={styles.heroTag}>
          <Sparkles size={12} />
          <span>Real-Time Code Collaboration</span>
        </div>

        <h1 className={styles.heroHeading}>
          Live collaborative code editor <br />
          <span className={styles.heroGradient}>built for students &amp; developers.</span>
        </h1>

        <p className={styles.heroSubtext}>
          Open a persistent virtual room, drop in your project folder, and simultaneously edit 
          code with remote cursors, live syntax highlighting, and an integrated console. Zero installation required.
        </p>

        {/* Quick Launch Action Bar */}
        <div className={styles.quickBar}>
          <input
            type="text"
            className={styles.quickInput}
            placeholder="Your name (e.g. Alex)"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
          <button 
            className={styles.quickPrimaryBtn}
            onClick={() => {
              if (!displayName.trim()) {
                handleOpenModal('create');
              } else {
                onCreate(displayName.trim());
              }
            }}
          >
            <Plus size={14} />
            <span>New Workspace</span>
          </button>
          <button 
            className={styles.quickSecondaryBtn}
            onClick={() => handleOpenModal('join')}
          >
            <ArrowRight size={14} />
            <span>Join with ID</span>
          </button>
        </div>

        {/* Realistic Interactive Mockup matching the Ceditor dark-slate screenshot */}
        <div className={styles.mockupContainer}>
          <div className={styles.mockupWindow}>
            {/* Mockup Titlebar */}
            <div className={styles.mockupTitlebar}>
              <div className={styles.mockupDots}>
                <span className={styles.dotRed} />
                <span className={styles.dotYellow} />
                <span className={styles.dotGreen} />
              </div>
              <div className={styles.mockupBrand}>
                <div className={styles.mockupBrandBadge}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="16 18 22 12 16 6" />
                    <polyline points="8 6 2 12 8 18" />
                  </svg>
                </div>
                <span>Kollab — Live Workspace</span>
              </div>
              <div className={styles.mockupRightStatus}>
                <span className={styles.statusDot} />
                <span>2 Collaborators</span>
              </div>
            </div>

            {/* Mockup Body */}
            <div className={styles.mockupBody}>
              {/* Activity Bar Strip */}
              <div className={styles.mockupActivityBar}>
                <div className={`${styles.mockupIcon} ${styles.mockupIconActive}`}>
                  <FolderTree size={14} />
                </div>
                <div className={styles.mockupIcon}>
                  <Users size={14} />
                </div>
                <div className={styles.mockupIcon}>
                  <Terminal size={14} />
                </div>
              </div>

              {/* Explorer Sidebar */}
              <div className={styles.mockupExplorer}>
                <div className={styles.mockupNewBtn}>
                  <span>New</span>
                  <Plus size={12} />
                </div>
                <div className={styles.mockupFolderTree}>
                  <div className={styles.treeFolder}>▾ app/</div>
                  <div className={styles.treeFolderIndent}>▾ lib/</div>
                  <div className={`${styles.treeFile} ${styles.treeFileActive}`}>
                    <span className={styles.badgeDart}>DART</span>
                    <span>Main.dart</span>
                  </div>
                  <div className={styles.treeFile}>
                    <span className={styles.badgePy}>PY</span>
                    <span>builders.py</span>
                  </div>
                  <div className={styles.treeFile}>
                    <span className={styles.badgeGit}>git</span>
                    <span>.gitignore</span>
                  </div>
                </div>
              </div>

              {/* Editor Pane */}
              <div className={styles.mockupEditor}>
                <div className={styles.mockupTabBar}>
                  <div className={`${styles.mockupTab} ${styles.mockupTabActive}`}>
                    <span className={styles.badgeDart}>DART</span>
                    <span>Main.dart</span>
                    <X size={11} />
                  </div>
                  <div className={styles.mockupTab}>
                    <span className={styles.badgePy}>PY</span>
                    <span>builders.py</span>
                    <X size={11} />
                  </div>
                  <div className={styles.mockupRunBadge}>
                    <Play size={10} fill="currentColor" />
                    <span>Run</span>
                  </div>
                </div>

                <div className={styles.mockupCodeCanvas}>
                  <div className={styles.codeLine}>
                    <span className={styles.lineNum}>1</span>
                    <span className={styles.tokenKeyword}>import</span>{' '}
                    <span className={styles.tokenString}>'package:flutter/material.dart'</span>;
                  </div>
                  <div className={styles.codeLine}>
                    <span className={styles.lineNum}>2</span>
                  </div>
                  <div className={styles.codeLine}>
                    <span className={styles.lineNum}>3</span>
                    <span className={styles.tokenType}>void</span>{' '}
                    <span className={styles.tokenFunc}>main</span>() &#123;
                  </div>
                  <div className={styles.codeLine}>
                    <span className={styles.lineNum}>4</span>
                    &nbsp;&nbsp;<span className={styles.tokenFunc}>runApp</span>(<span className={styles.tokenKeyword}>const</span>{' '}
                    <span className={styles.tokenType}>MyApp</span>());
                  </div>
                  <div className={styles.codeLine}>
                    <span className={styles.lineNum}>5</span>
                    &#125;
                  </div>
                  <div className={styles.codeLine}>
                    <span className={styles.lineNum}>6</span>
                  </div>
                  <div className={styles.codeLine}>
                    <span className={styles.lineNum}>7</span>
                    <span className={styles.tokenKeyword}>class</span>{' '}
                    <span className={styles.tokenType}>MyApp</span>{' '}
                    <span className={styles.tokenKeyword}>extends</span>{' '}
                    <span className={styles.tokenType}>StatelessWidget</span> &#123;
                    {/* Simulated Remote Cursor */}
                    <div className={styles.simCursor}>
                      <span className={styles.cursorTag}>Alex</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className={styles.featuresSection}>
        <div className={styles.sectionHeader}>
          <h2>Engineered for seamless pair programming</h2>
          <p>Everything you need for student group projects, live coding interviews, and quick code sharing.</p>
        </div>

        <div className={styles.featureCardsGrid}>
          <div className={styles.card}>
            <div className={styles.cardIcon}>
              <FolderTree size={20} />
            </div>
            <h3>Multi-File Project Explorer</h3>
            <p>
              Work with complex projects. Open or drag &amp; drop an entire project folder from your computer, 
              manage files, and switch between open documents with tabbed navigation.
            </p>
          </div>

          <div className={styles.card}>
            <div className={styles.cardIcon}>
              <Users size={20} />
            </div>
            <h3>Real-Time Live Collaboration</h3>
            <p>
              Powered by CRDT synchronization. Multiple participants can type simultaneously without race conditions, 
              view colored collaborator cursors, and track live presence.
            </p>
          </div>

          <div className={styles.card}>
            <div className={styles.cardIcon}>
              <Terminal size={20} />
            </div>
            <h3>Integrated Console &amp; Output</h3>
            <p>
              Test and execute code directly in the browser with one click. View output logs, debug runtime errors, 
              and render live HTML/CSS previews in real time.
            </p>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className={styles.workflowSection}>
        <div className={styles.sectionHeader}>
          <h2>How Kollab Works</h2>
          <p>Three simple steps to collaborate with anyone, anywhere.</p>
        </div>

        <div className={styles.stepsGrid}>
          <div className={styles.stepItem}>
            <div className={styles.stepNum}>01</div>
            <h4>Create or Join a Room</h4>
            <p>Click Launch Workspace to create a persistent room with an optional passcode, or join via Room ID.</p>
          </div>
          <div className={styles.stepItem}>
            <div className={styles.stepNum}>02</div>
            <h4>Import or Add Files</h4>
            <p>Drop your local project folder right into the file explorer or create new files with one click.</p>
          </div>
          <div className={styles.stepItem}>
            <div className={styles.stepNum}>03</div>
            <h4>Code &amp; Run Together</h4>
            <p>Write code simultaneously, see each other's cursor positions, and execute scripts in the console.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerBrand}>
          <div className={styles.brandIconSmall}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
          </div>
          <span>Kollab</span>
          <span className={styles.footerMuted}>— 100% Free &amp; Open Source</span>
        </div>
        <div className={styles.footerLinks}>
          <a href="https://github.com/Rudr4nksh/Kollab" target="_blank" rel="noreferrer">
            GitHub Repository
          </a>
        </div>
      </footer>

      {/* Modal Dialog for Launching or Joining Room */}
      {modalMode && (
        <div className={styles.modalBackdrop} onClick={handleCloseModal}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalHeaderBrand}>
                <div className={styles.brandIconSmall}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="16 18 22 12 16 6" />
                    <polyline points="8 6 2 12 8 18" />
                  </svg>
                </div>
                <h3>{modalMode === 'create' ? 'Create New Workspace' : 'Join Existing Workspace'}</h3>
              </div>
              <button className={styles.modalCloseBtn} onClick={handleCloseModal}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className={styles.modalForm}>
              {activeError && (
                <div className={styles.modalErrorBox}>
                  <span>{activeError}</span>
                </div>
              )}

              <Input
                label="Your Name"
                placeholder="e.g. Alex"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                leftIcon={<User size={14} />}
                required
                autoFocus
              />

              <Input
                label={modalMode === 'join' ? 'Room ID' : 'Room ID (optional)'}
                placeholder={modalMode === 'join' ? 'e.g. room-7F4K2 or demo123' : 'Leave empty to auto-generate'}
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                required={modalMode === 'join'}
              />

              <Input
                label={modalMode === 'join' ? 'Passcode (if protected)' : 'Passcode (optional)'}
                type="password"
                placeholder="Leave blank for open room"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                leftIcon={<Shield size={14} />}
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isLoading}
                className={styles.modalSubmitBtn}
                icon={modalMode === 'create' ? <Plus size={15} /> : <ArrowRight size={15} />}
              >
                {modalMode === 'create' ? 'Launch Workspace' : 'Enter Workspace'}
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
