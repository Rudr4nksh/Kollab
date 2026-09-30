import React, { useState, useRef } from 'react';
import { 
  Plus, 
  ArrowRight, 
  Shield, 
  User, 
  FolderTree, 
  Terminal, 
  Users, 
  Play, 
  Zap,
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

  // 3D Interactive Parallax on the Code Window
  const [rotate, setRotate] = useState({ x: 12, y: -16 });
  const mockupRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!mockupRef.current) return;
    const rect = mockupRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Calculate subtle 3D tilt offset from base isometric angle
    const rotX = 12 - ((y - centerY) / centerY) * 10;
    const rotY = -16 + ((x - centerX) / centerX) * 12;

    setRotate({ x: rotX, y: rotY });
  };

  const handleMouseLeave = () => {
    // Return to default cinematic isometric angle
    setRotate({ x: 12, y: -16 });
  };

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
      {/* Background Matrix Grid */}
      <div className={styles.bgGrid} />
      <div className={styles.bgGlowOrb} />
      <div className={styles.bgGlowOrbSecondary} />

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

        {/* Centered Navigation */}
        <div className={styles.navLinks}>
          <a href="#features">Features</a>
          <a href="#workflow">Workflow</a>
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
            New Workspace
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className={styles.heroSection}>
        <div className={styles.badgeWrapper}>
          <div className={styles.heroBadge}>
            <span className={styles.pulseDot} />
            <span>Built by students, for students. No Discord lag.</span>
          </div>
        </div>

        <h1 className={styles.heroHeading}>
          Code together like you're <br />
          <span className={styles.heroGradient}>sitting at the same keyboard.</span>
        </h1>

        <p className={styles.heroSubtext}>
          Drop in your local project folder, share a 5-digit room ID, and collaborate in a high-performance 
          dark slate IDE with real-time CRDT sync and in-browser execution.
        </p>

        {/* Quick Launch Bar */}
        <div className={styles.quickBar}>
          <input
            type="text"
            className={styles.quickInput}
            placeholder="Enter your name (e.g. Alex)"
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
            <span>Create Session</span>
          </button>
          <button 
            className={styles.quickSecondaryBtn}
            onClick={() => handleOpenModal('join')}
          >
            <ArrowRight size={14} />
            <span>Join Room</span>
          </button>
        </div>

        {/* 3D Cinematic Isometric Editor Mockup */}
        <div 
          className={styles.perspectiveStage}
          ref={mockupRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* Floating 3D Glass Pill (Top Left) */}
          <div className={`${styles.floatingGlassBadge} ${styles.badgeTopLeft}`}>
            <Zap size={13} className={styles.badgeIconElectric} />
            <span>Yjs CRDT &bull; 14ms Live Sync</span>
          </div>

          {/* Floating 3D Collaborator Tag (Bottom Right) */}
          <div className={`${styles.floatingGlassBadge} ${styles.badgeBottomRight}`}>
            <span className={styles.collaboratorAvatar}>S</span>
            <div className={styles.collaboratorInfo}>
              <span className={styles.collaboratorName}>Sam</span>
              <span className={styles.collaboratorAction}>editing line 12...</span>
            </div>
          </div>

          {/* The 3D Tilted Editor Window */}
          <div 
            className={styles.mockup3DWindow}
            style={{
              transform: `rotateX(${rotate.x}deg) rotateY(${rotate.y}deg) rotateZ(3deg)`,
            }}
          >
            {/* Titlebar */}
            <div className={styles.mockupTitlebar}>
              <div className={styles.mockupDots}>
                <span className={styles.dotRed} />
                <span className={styles.dotYellow} />
                <span className={styles.dotGreen} />
              </div>
              <div className={styles.mockupBrand}>
                <div className={styles.mockupBrandBadge}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="16 18 22 12 16 6" />
                    <polyline points="8 6 2 12 8 18" />
                  </svg>
                </div>
                <span>Kollab Workspace &bull; room-7F4K2</span>
              </div>
              <div className={styles.mockupRightStatus}>
                <span className={styles.liveIndicatorDot} />
                <span>2 Active Now</span>
              </div>
            </div>

            {/* IDE Body */}
            <div className={styles.mockupBody}>
              {/* Activity Bar */}
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

              {/* File Tree */}
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
                  <div className={styles.codeLine}>
                    <span className={styles.lineNum}>8</span>
                    &nbsp;&nbsp;<span className={styles.tokenDecorator}>@override</span>
                  </div>
                  <div className={styles.codeLine}>
                    <span className={styles.lineNum}>9</span>
                    &nbsp;&nbsp;<span className={styles.tokenType}>Widget</span>{' '}
                    <span className={styles.tokenFunc}>build</span>(BuildContext context) &#123;
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
          <div className={styles.smallSubheader}>DEVELOPER ARCHITECTURE</div>
          <h2>Designed for actual software development</h2>
          <p>No toy environments. Experience an authentic, multi-file IDE built on battle-tested open source tech.</p>
        </div>

        <div className={styles.featureCardsGrid}>
          <div className={styles.card}>
            <div className={styles.cardIcon}>
              <FolderTree size={20} />
            </div>
            <h3>Project Folder Drop</h3>
            <p>
              Drag &amp; drop an entire project directory from your computer. Kollab recursively maps your folders 
              and files into the tree without uploading to third-party cloud lockers.
            </p>
          </div>

          <div className={styles.card}>
            <div className={styles.cardIcon}>
              <Users size={20} />
            </div>
            <h3>CRDT Multi-User Engine</h3>
            <p>
              Conflict-free replicated data types ensure simultaneous edits never clash or overwrite your classmate's 
              code. See their active lines and live colored cursors.
            </p>
          </div>

          <div className={styles.card}>
            <div className={styles.cardIcon}>
              <Terminal size={20} />
            </div>
            <h3>Integrated Console &amp; Runner</h3>
            <p>
              Execute code with <strong>▶ Run</strong> directly in the browser. Capture console outputs, debug runtime 
              stack traces, and test live web applications in the sandbox iframe.
            </p>
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section id="workflow" className={styles.workflowSection}>
        <div className={styles.sectionHeader}>
          <div className={styles.smallSubheader}>HOW IT WORKS</div>
          <h2>Zero setup. Three simple steps.</h2>
        </div>

        <div className={styles.stepsGrid}>
          <div className={styles.stepCard}>
            <div className={styles.stepNumberBadge}>1</div>
            <h4>Create Workspace</h4>
            <p>Launch a room with an optional passcode. You automatically become the host.</p>
          </div>

          <div className={styles.stepCard}>
            <div className={styles.stepNumberBadge}>2</div>
            <h4>Import Your Files</h4>
            <p>Drop your project folder or create new files in the sidebar with one click.</p>
          </div>

          <div className={styles.stepCard}>
            <div className={styles.stepNumberBadge}>3</div>
            <h4>Code &amp; Execute</h4>
            <p>Type simultaneously, test with the built-in console runner, and build together.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerBrand}>
          <div className={styles.brandIconSmall}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
          </div>
          <span>Kollab</span>
          <span className={styles.footerMuted}>&bull; 100% Free &amp; Open Source</span>
        </div>

        <div className={styles.footerLinks}>
          <a href="https://github.com/Rudr4nksh/Kollab" target="_blank" rel="noreferrer">
            GitHub Repository
          </a>
        </div>
      </footer>

      {/* Modal Dialog */}
      {modalMode && (
        <div className={styles.modalBackdrop} onClick={handleCloseModal}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalHeaderBrand}>
                <div className={styles.brandIconSmall}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="16 18 22 12 16 6" />
                    <polyline points="8 6 2 12 8 18" />
                  </svg>
                </div>
                <h3>{modalMode === 'create' ? 'Create Collaborative Workspace' : 'Join Existing Workspace'}</h3>
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
                placeholder="Leave blank for public room"
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
