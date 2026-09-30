import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, 
  ArrowRight, 
  FolderTree, 
  Terminal as TerminalIcon, 
  Users, 
  Play, 
  Zap,
  X,
  Code2,
  CheckCircle2,
  XCircle,
  Cpu,
  ArrowUpRight
} from 'lucide-react';
import { Input } from '../../components/UI/Input.tsx';
import { Button } from '../../components/UI/Button.tsx';
import { ThreeHeroCanvas } from '../../components/ThreeCanvas/ThreeHeroCanvas.tsx';
import { ProjectTreeMap } from '../../components/TreeMap/ProjectTreeMap.tsx';
import { playThockSound } from '../../utils/audioEffects.ts';
import styles from './HomePage.module.css';

interface HomePageProps {
  onJoin: (roomId: string, name: string, passcode?: string) => Promise<void>;
  onCreate: (name: string, customRoomId?: string, passcode?: string) => Promise<void>;
  error?: string | null;
  isLoading?: boolean;
}

// Sample file contents for the interactive 3D hero editor
const DEMO_FILES: Record<string, { lang: string; badgeClass: string; code: string[] }> = {
  'index.ts': {
    lang: 'TS',
    badgeClass: styles.badgeTs,
    code: [
      "import { KollabRoom } from '@kollab/engine';",
      "",
      "// Instant peer-to-peer workspace",
      "const room = new KollabRoom({ id: '7F4K2' });",
      "",
      "room.on('sync', (peer) => {",
      "  console.log(`[Mesh] Syncing with ${peer.name}`);",
      "});",
      "",
      "room.broadcast({ status: 'ready', latencyMs: 14 });"
    ]
  },
  'server.py': {
    lang: 'PY',
    badgeClass: styles.badgePy,
    code: [
      "from fastapi import FastAPI",
      "import kollab_crdt",
      "",
      "app = FastAPI(title='Kollab Core')",
      "",
      "@app.get('/room/status')",
      "def get_status():",
      "    return {'status': 'live', 'peers': 3, 'mem': '14MB'}"
    ]
  },
  'styles.css': {
    lang: 'CSS',
    badgeClass: styles.badgeDart,
    code: [
      ":root {",
      "  --bg-slate: #0B0E14;",
      "  --accent-cyan: #38BDF8;",
      "}",
      "",
      ".editor-window {",
      "  backdrop-filter: blur(14px);",
      "  border: 1px solid var(--accent-cyan);",
      "}"
    ]
  }
};

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

  // High-Performance Parallax Refs (Zero React Re-renders, sleeps when idle)
  const mockupRef = useRef<HTMLDivElement>(null);
  const mockupWindowRef = useRef<HTMLDivElement>(null);
  const mouseTiltRef = useRef({ x: 2, y: 0 });
  const requestUpdateRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let animId: number | null = null;
    let targetScroll = window.scrollY || 0;
    let currentScroll = targetScroll;
    let currentRotX = 2;
    let currentRotY = 0;

    const updateTransforms = () => {
      currentScroll += (targetScroll - currentScroll) * 0.12;
      currentRotX += (mouseTiltRef.current.x - currentRotX) * 0.1;
      currentRotY += (mouseTiltRef.current.y - currentRotY) * 0.1;

      if (mockupWindowRef.current) {
        const translateY = currentScroll * 0.06;
        const scale = Math.max(1 - currentScroll * 0.00015, 0.96);
        mockupWindowRef.current.style.transform = `translate3d(0, ${translateY}px, 0) scale(${scale}) rotateX(${currentRotX}deg) rotateY(${currentRotY}deg)`;
      }

      // Settle and sleep when close to target to keep CPU at 0%
      const scrollDiff = Math.abs(targetScroll - currentScroll);
      const rotXDiff = Math.abs(mouseTiltRef.current.x - currentRotX);
      const rotYDiff = Math.abs(mouseTiltRef.current.y - currentRotY);

      if (scrollDiff > 0.1 || rotXDiff > 0.05 || rotYDiff > 0.05) {
        animId = requestAnimationFrame(updateTransforms);
      } else {
        animId = null;
      }
    };

    const requestUpdate = () => {
      if (!animId) {
        animId = requestAnimationFrame(updateTransforms);
      }
    };

    const onScroll = () => {
      targetScroll = window.scrollY || 0;
      requestUpdate();
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    requestUpdateRef.current = requestUpdate;
    requestUpdate();

    // IntersectionObserver for scroll-reveal on all boxes below
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.boxRevealed);
          }
        });
      },
      {
        threshold: 0.08,
        rootMargin: '0px 0px -40px 0px',
      }
    );

    const boxes = document.querySelectorAll('[data-scroll-box]');
    boxes.forEach((box) => observer.observe(box));

    return () => {
      if (animId) cancelAnimationFrame(animId);
      window.removeEventListener('scroll', onScroll);
      observer.disconnect();
    };
  }, []);

  // Interactive 3D Editor State
  const [activeTab, setActiveTab] = useState('index.ts');
  const [isRunning, setIsRunning] = useState(false);
  const [consoleLogs, setConsoleLogs] = useState<string[]>([
    '[INIT] Workspace session mounted (room-7F4K2)',
    '[CRDT] 0 merge conflicts recorded across 18 snapshots',
    '[READY] Click ▶ Run above to execute TypeScript in sandbox'
  ]);

  // Interactive Landing Page Terminal State
  const [terminalHistory, setTerminalHistory] = useState<Array<{ cmd: string; out: string[] }>>([
    {
      cmd: 'whoami',
      out: [
        'user: guest_developer',
        'status: searching for zero-lag code collaboration',
        'tip: type "help" or click the pills below for quick commands'
      ]
    }
  ]);
  const [terminalInput, setTerminalInput] = useState('');

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!mockupRef.current) return;
    const rect = mockupRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotX = 2 - ((y - centerY) / centerY) * 3;
    const rotY = ((x - centerX) / centerX) * 4;

    mouseTiltRef.current = { x: rotX, y: rotY };
    requestUpdateRef.current?.();

    if (mockupWindowRef.current) {
      mockupWindowRef.current.style.setProperty('--mouse-x', `${Math.round((x / rect.width) * 100)}%`);
      mockupWindowRef.current.style.setProperty('--mouse-y', `${Math.round((y / rect.height) * 100)}%`);
    }
  };

  const handleMouseLeave = () => {
    mouseTiltRef.current = { x: 2, y: 0 };
    requestUpdateRef.current?.();
  };

  const handleRunDemo = () => {
    playThockSound('run');
    setIsRunning(true);
    const timestamp = new Date().toLocaleTimeString();
    
    setConsoleLogs(prev => [
      ...prev,
      `[${timestamp}] ▶ Executing ${activeTab} in V8 sandbox...`,
      `[${timestamp}] ✓ Connected to Kollab WebSocket mesh (14ms)`,
      `[${timestamp}] [Rudranksh] synced 4 changed lines`,
      `[${timestamp}] [Alex] "wait it actually compiles 🚀"`,
      `[${timestamp}] Process exited with code 0 (success)`
    ]);

    setTimeout(() => {
      setIsRunning(false);
    }, 400);
  };

  const handleTerminalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = terminalInput.trim().toLowerCase();
    if (!cmd) return;

    playThockSound('key');
    executeTerminalCommand(cmd);
    setTerminalInput('');
  };

  const executeTerminalCommand = (cmd: string) => {
    let out: string[] = [];

    switch (cmd) {
      case 'help':
        out = [
          'Available commands:',
          '  about    - Why Kollab exists (no more 720p Discord screen shares)',
          '  specs    - Technical stack (Yjs CRDT, Monaco, SQLite, WebSockets)',
          '  matrix   - Enter the matrix code stream',
          '  joke     - Authentic developer humor',
          '  rooms    - Instant room creation demo',
          '  clear    - Clear terminal screen'
        ];
        break;
      case 'about':
        out = [
          'Kollab was built by students who were tired of Google Docs destroying code indentation',
          'and Discord screen share dropping to 15fps at 2 AM.',
          'No signup walls, no credit cards. Drop a folder and start coding.'
        ];
        break;
      case 'specs':
        out = [
          'ARCHITECTURE SPECS:',
          '  [Engine]     Yjs CRDT (Conflict-Free Replicated Data Types)',
          '  [Editor]     Monaco Editor (VS Code engine)',
          '  [Transport]  Real-time Socket.IO WebSockets with rate-limiting',
          '  [Storage]    Local SQLite via Prisma (100% free hosting ready)',
          '  [Audio]      Synthesized Web Audio API mechanical switches'
        ];
        break;
      case 'matrix':
        out = [
          '01001011 01001111 01001100 01001100 01000001 01000010',
          'Wake up, Neo...',
          'The collaborative IDE has you.',
          'Follow the white rabbit to https://github.com/Rudr4nksh/Kollab'
        ];
        break;
      case 'joke':
        const jokes = [
          'Why do programmers prefer dark mode? Because light attracts bugs.',
          'A SQL query walks into a bar, walks up to two tables and asks: "Can I join you?"',
          'There are 10 types of people: those who understand binary, and those who do not.',
          '"It compiled on my machine" - Alex, 3 minutes before the presentation.'
        ];
        out = [jokes[Math.floor(Math.random() * jokes.length)]];
        break;
      case 'rooms':
        out = [
          'Quick Room Codes Available:',
          '  • room-4X91B  [Web Dev & React]',
          '  • room-9P33C  [Python Algorithms]',
          '  • room-7F4K2  [Flutter & Dart]'
        ];
        break;
      case 'clear':
        setTerminalHistory([]);
        return;
      default:
        out = [`command not recognized: "${cmd}". Type "help" for a list of commands.`];
    }

    setTerminalHistory(prev => [...prev, { cmd, out }]);
  };

  const handleOpenModal = (mode: 'create' | 'join', initialRoomId: string = '') => {
    playThockSound('click');
    setModalMode(mode);
    setRoomId(initialRoomId);
    setLocalError(null);
  };

  const handleCloseModal = () => {
    playThockSound('click');
    setModalMode(null);
    setLocalError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    playThockSound('click');
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
      {/* 3D WebGL Three.js Interactive Background */}
      <ThreeHeroCanvas className={styles.bgThreeCanvas} />

      {/* Ambient Cosmic Aura Backlight (matching reference image) */}
      <div className={styles.bgCosmicAura} />

      {/* Main Navbar - Centered Navigation Grid */}
      <nav className={styles.navBar}>
        <div className={styles.navBrand} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <div className={styles.brandIcon}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
              <line x1="14" y1="4" x2="10" y2="20" stroke="currentColor" strokeWidth="2" opacity="0.6" />
            </svg>
          </div>
          <span className={styles.brandTitle}>Kollab</span>
          <span className={styles.brandVersion}>v2.0</span>
        </div>

        {/* Dead-Centered Nav Links */}
        <div className={styles.navLinks}>
          <a href="#editor">Editor</a>
          <a href="#story">Why Kollab</a>
          <a href="#features">Architecture</a>
          <a href="#terminal">Terminal</a>
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

      {/* Hero Section (Matching Reference Image) */}
      <section className={styles.heroSection}>
        <div className={styles.badgeWrapper}>
          <div className={styles.heroBadge} onClick={() => handleOpenModal('create')}>
            <span className={styles.badgeTag}>NEW RELEASE v2.0</span>
            <span>Instant Browser Code Runner &bull; Multi-File Tabs ↗</span>
          </div>
        </div>

        <h1 className={styles.heroHeading}>
          The collaborative code editor <br />
          for teams that build together.
        </h1>

        <p className={styles.heroSubtext}>
          Instant cursor synchronization, native folder drag-and-drop, and in-browser execution. <br />
          No signup walls, no expiring tokens, 100% free hosting ready.
        </p>

        {/* Hero Actions Row (Solid White Pill + Dark Glass Pill) */}
        <div className={styles.heroActionsRow}>
          <button 
            className={styles.heroPrimaryBtn}
            onClick={() => handleOpenModal('create')}
          >
            <span>Create Workspace</span>
            <ArrowUpRight size={14} />
          </button>
          <button 
            className={styles.heroSecondaryBtn}
            onClick={() => handleOpenModal('join')}
          >
            <Play size={12} fill="currentColor" />
            <span>Join Room</span>
          </button>
        </div>

        {/* Central Showcase Window */}
        <div 
          id="editor"
          className={styles.perspectiveStage}
          ref={mockupRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* Straight-On Grounded Showcase Window */}
          <div 
            ref={mockupWindowRef}
            className={styles.mockupWindow}
            style={{
              transform: 'translate3d(0, 0, 0) scale(1) rotateX(2deg) rotateY(0deg)',
            }}
          >
            {/* Dynamic Specular Light Layer */}
            <div className={styles.mockupGlare} />

            {/* Titlebar */}
            <div className={styles.mockupTitlebar}>
              <div className={styles.mockupDots}>
                <span className={styles.dotRed} />
                <span className={styles.dotYellow} />
                <span className={styles.dotGreen} />
              </div>
              <div className={styles.mockupBrand}>
                <div className={styles.mockupBrandBadge}>
                  <Code2 size={11} />
                </div>
                <span>Kollab Live IDE &bull; room-7F4K2 &bull; Interactive Sandbox</span>
              </div>
              <div className={styles.mockupRightStatus}>
                <span className={styles.liveIndicatorDot} />
                <span>2 Active Peers</span>
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
                  <TerminalIcon size={14} />
                </div>
              </div>

              {/* File Tree */}
              <div className={styles.mockupExplorer}>
                <div className={styles.mockupNewBtn}>
                  <span>Project Files</span>
                  <Plus size={11} />
                </div>
                <div className={styles.mockupFolderTree}>
                  <div className={styles.treeFolder}>▾ src/</div>
                  <div className={styles.treeFolderIndent}>▾ components/</div>
                  {Object.keys(DEMO_FILES).map(fileName => (
                    <div 
                      key={fileName}
                      className={`${styles.treeFile} ${activeTab === fileName ? styles.treeFileActive : ''}`}
                      onClick={() => {
                        playThockSound('click');
                        setActiveTab(fileName);
                      }}
                    >
                      <span className={DEMO_FILES[fileName].badgeClass}>{DEMO_FILES[fileName].lang}</span>
                      <span>{fileName}</span>
                    </div>
                  ))}
                  <div className={styles.treeFile}>
                    <span className={styles.badgeGit}>GIT</span>
                    <span>.gitignore</span>
                  </div>
                </div>
              </div>

              {/* Editor Pane */}
              <div className={styles.mockupEditor}>
                <div className={styles.mockupTabBar}>
                  <div className={styles.mockupTabsLeft}>
                    {Object.keys(DEMO_FILES).map(fileName => (
                      <div 
                        key={fileName}
                        className={`${styles.mockupTab} ${activeTab === fileName ? styles.mockupTabActive : ''}`}
                        onClick={() => {
                          playThockSound('click');
                          setActiveTab(fileName);
                        }}
                      >
                        <span className={DEMO_FILES[fileName].badgeClass}>{DEMO_FILES[fileName].lang}</span>
                        <span>{fileName}</span>
                      </div>
                    ))}
                  </div>

                  {/* Interactive Run Button */}
                  <button 
                    className={styles.mockupRunBadge}
                    onClick={handleRunDemo}
                    title="Execute demo code in sandbox"
                  >
                    <Play size={10} fill="currentColor" />
                    <span>{isRunning ? 'Running...' : 'Run'}</span>
                  </button>
                </div>

                {/* Code Canvas */}
                <div className={styles.mockupCodeCanvas}>
                  {DEMO_FILES[activeTab].code.map((line, idx) => (
                    <div key={idx} className={styles.codeLine}>
                      <span className={styles.lineNum}>{idx + 1}</span>
                      <span>{line}</span>
                      {/* Simulated Collaborator Cursor 1 */}
                      {idx === 4 && activeTab === 'index.ts' && (
                        <span className={styles.simCursor}>
                          <span className={styles.cursorTag}>Rudranksh</span>
                        </span>
                      )}
                      {/* Simulated Collaborator Cursor 2 */}
                      {idx === 7 && activeTab === 'index.ts' && (
                        <span className={`${styles.simCursor} ${styles.simCursorAlex}`}>
                          <span className={`${styles.cursorTag} ${styles.cursorTagAlex}`}>Alex</span>
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Mini Integrated Console Output */}
                <div className={styles.mockupConsoleOutput}>
                  <div className={styles.consoleHeader}>
                    <span>Integrated Runner Console</span>
                    <span>Output Log</span>
                  </div>
                  {consoleLogs.slice(-3).map((log, i) => (
                    <div key={i} className={styles.consoleRow}>
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof / Tech Logo Row (matching reference image) */}
      <section className={styles.logoRowSection}>
        <div className={styles.logoRowLabel}>ENGINEERED WITH MODERN OPEN STANDARDS</div>
        <div className={styles.logosFlex}>
          <div className={styles.logoItem}>
            <Cpu size={15} />
            <span>Yjs CRDT</span>
          </div>
          <div className={styles.logoItem}>
            <Code2 size={15} />
            <span>Monaco Editor</span>
          </div>
          <div className={styles.logoItem}>
            <Zap size={15} />
            <span>WebSockets</span>
          </div>
          <div className={styles.logoItem}>
            <TerminalIcon size={15} />
            <span>TypeScript</span>
          </div>
          <div className={styles.logoItem}>
            <FolderTree size={15} />
            <span>SQLite Engine</span>
          </div>
          <div className={styles.logoItem}>
            <Users size={15} />
            <span>GitHub Open Source</span>
          </div>
        </div>
      </section>

      {/* Editorial Vision Section (matching reference image) */}
      <section className={styles.editorialSection}>
        <div className={styles.editorialTag}>DESIGNED FOR FRICTIONLESS HACKING</div>
        <h2 className={styles.editorialHeading}>
          Turn chaotic pair-programming into clear, frictionless collaboration.
        </h2>
        <p className={styles.editorialSubtext}>
          No 720p 15fps screen shares. No Google Docs indentation destruction. No 15-minute setup hurdles. 
          Just drop your folder and build with real-time peer awareness.
        </p>
      </section>

      {/* Relatable / Humanized Story Section */}
      <section id="story" className={styles.storySection}>
        <div className={`${styles.storyCard} ${styles.scrollBox}`} data-scroll-box>
          <div className={styles.storyContent}>
            <div className={styles.smallSubheader}>THE REAL PROBLEM</div>
            <h3>We built this because coding with friends shouldn't hurt.</h3>
            <p>
              Remember having to zip your project folder and send it over WhatsApp or Discord? 
              Or sharing your screen while your friend reads out line numbers over 240p compression?
            </p>
            <p>
              <strong>Kollab</strong> solves this with zero bloat. No 5-minute setup. No Git merge conflicts 
              for a quick pair-programming session. Just send the 5-digit room link, drop your code, and hack.
            </p>
          </div>

          <div className={styles.comparisonBox}>
            <div className={styles.compRowBad}>
              <XCircle size={15} />
              <div>
                <strong>Discord Screenshare:</strong> 720p 15fps, text is illegible, companion can't edit.
              </div>
            </div>
            <div className={styles.compRowBad}>
              <XCircle size={15} />
              <div>
                <strong>Google Docs:</strong> Replaces quotes with smart quotes, destroys indentation.
              </div>
            </div>
            <div className={styles.compRowGood}>
              <CheckCircle2 size={15} />
              <div>
                <strong>The Kollab Way:</strong> Monaco editor, real-time colored cursors, instant browser runner.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Hacker Terminal Section */}
      <section id="terminal" className={styles.terminalSection}>
        <div className={`${styles.sectionHeader} ${styles.scrollBox}`} data-scroll-box>
          <div className={styles.smallSubheader}>LIVE INTERACTIVE CLI</div>
          <h2>Test the engine directly in your browser</h2>
          <p>Type commands below or click the shortcut pills to test our system specs.</p>
        </div>

        <div className={`${styles.terminalCard} ${styles.scrollBox}`} data-scroll-box>
          <div className={styles.terminalBar}>
            <span>bash &bull; kollab-cli &bull; guest@kollab</span>
            <span>UTF-8</span>
          </div>

          <div className={styles.terminalBody}>
            {terminalHistory.map((item, i) => (
              <div key={i} className={styles.termLine}>
                <div>
                  <span className={styles.termPrompt}>guest@kollab:~$ </span>
                  <span>{item.cmd}</span>
                </div>
                {item.out.map((line, j) => (
                  <div key={j} style={{ color: line.startsWith('  [') ? '#FF7A59' : '#94A3B8' }}>
                    {line}
                  </div>
                ))}
              </div>
            ))}

            <form onSubmit={handleTerminalSubmit} className={styles.termInputLine}>
              <span className={styles.termPrompt}>guest@kollab:~$ </span>
              <input
                type="text"
                className={styles.termInput}
                value={terminalInput}
                onChange={(e) => setTerminalInput(e.target.value)}
                placeholder="type help, specs, joke, matrix..."
                autoComplete="off"
                spellCheck="false"
              />
            </form>
          </div>

          <div className={styles.termHelpPills}>
            <span>Try quick commands:</span>
            {['help', 'about', 'specs', 'matrix', 'joke', 'rooms', 'clear'].map(pill => (
              <button
                key={pill}
                type="button"
                className={styles.termPill}
                onClick={() => {
                  playThockSound('key');
                  executeTerminalCommand(pill);
                }}
              >
                {pill}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive Project Tree Map (User's Creative Architecture System) */}
      <section id="features" className={styles.treeMapSection}>
        <div className={styles.sectionHeader}>
          <div className={styles.smallSubheader}>WORKSPACE ARCHITECTURE</div>
          <h2>Interactive Project Tree Map</h2>
          <p>Explore how Kollab coordinates files, conflict-free CRDT state, sandbox execution, and session security.</p>
        </div>
        <ProjectTreeMap />
      </section>

      {/* 3-Step Workflow */}
      <section className={styles.workflowSection}>
        <div className={`${styles.sectionHeader} ${styles.scrollBox}`} data-scroll-box>
          <div className={styles.smallSubheader}>GET STARTED IN 10 SECONDS</div>
          <h2>How it works</h2>
        </div>

        <div className={styles.stepsGrid}>
          <div className={`${styles.stepCard} ${styles.scrollBox} ${styles.stagger1}`} data-scroll-box>
            <div className={styles.stepNumber}>01</div>
            <h3>Create a Room</h3>
            <p>Enter your name and pick a room name. No email, no password, no waitlist.</p>
          </div>
          <div className={`${styles.stepCard} ${styles.scrollBox} ${styles.stagger2}`} data-scroll-box>
            <div className={styles.stepNumber}>02</div>
            <h3>Drop Your Project</h3>
            <p>Drop your local project folder to populate the file tree, or start with a fresh file.</p>
          </div>
          <div className={`${styles.stepCard} ${styles.scrollBox} ${styles.stagger3}`} data-scroll-box>
            <div className={styles.stepNumber}>03</div>
            <h3>Share the 5-Digit ID</h3>
            <p>Send the room ID to your lab partners. Edit code together simultaneously with zero lag.</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={`${styles.ctaSection} ${styles.scrollBox}`} data-scroll-box>
        <h2 className={styles.ctaHeading}>Ready to collaborate without the headaches?</h2>
        <p className={styles.ctaSubtext}>Start an instant session right now. Free forever.</p>
        <div className={styles.ctaButtons}>
          <button 
            className={styles.quickPrimaryBtn}
            onClick={() => handleOpenModal('create')}
          >
            <Plus size={15} />
            <span>Create New Workspace</span>
          </button>
          <button 
            className={styles.quickSecondaryBtn}
            onClick={() => handleOpenModal('join')}
          >
            <ArrowRight size={15} />
            <span>Join Existing Room</span>
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div>
          <span>Kollab &bull; Created by </span>
          <a 
            href="https://github.com/Rudr4nksh" 
            target="_blank" 
            rel="noreferrer"
            style={{ color: '#FF7A59', textDecoration: 'none', fontWeight: 600 }}
          >
            Rudranksh Parial
          </a>
        </div>
        <div className={styles.footerLinks}>
          <a href="https://github.com/Rudr4nksh/Kollab" target="_blank" rel="noreferrer">
            GitHub Repository
          </a>
          <a href="#features">Architecture</a>
          <a href="#editor">Live Playground</a>
        </div>
      </footer>

      {/* Modal Dialog for Create / Join */}
      {modalMode && (
        <div className={styles.modalBackdrop} onClick={handleCloseModal}>
          <div className={styles.modalWindow} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>
                {modalMode === 'create' ? 'Create New Workspace' : 'Join Existing Workspace'}
              </div>
              <button className={styles.modalCloseBtn} onClick={handleCloseModal}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className={styles.modalForm}>
              {activeError && (
                <div className={styles.modalError}>
                  {activeError}
                </div>
              )}

              <Input
                label="Your Display Name *"
                placeholder="e.g. Alex"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                autoFocus
              />

              <Input
                label={modalMode === 'create' ? 'Custom Room ID (Optional)' : 'Room ID *'}
                placeholder="e.g. hackathon-2026"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
              />

              <Input
                label="Room Passcode (Optional)"
                type="password"
                placeholder="Leave blank for public room"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
              />

              <div className={styles.modalFooter}>
                <Button 
                  type="button" 
                  variant="secondary" 
                  size="sm" 
                  onClick={handleCloseModal}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  variant="primary" 
                  size="sm"
                  disabled={isLoading}
                >
                  {isLoading ? 'Connecting...' : modalMode === 'create' ? 'Create Room' : 'Join Room'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
