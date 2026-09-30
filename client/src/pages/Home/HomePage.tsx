import React, { useState, useRef } from 'react';
import { 
  Plus, 
  ArrowRight, 
  Shield, 
  FolderTree, 
  Terminal as TerminalIcon, 
  Users, 
  Play, 
  Zap,
  X,
  Volume2,
  VolumeX,
  Code2,
  CheckCircle2,
  XCircle,
  Cpu
} from 'lucide-react';
import { Input } from '../../components/UI/Input.tsx';
import { Button } from '../../components/UI/Button.tsx';
import { ThreeHeroCanvas } from '../../components/ThreeCanvas/ThreeHeroCanvas.tsx';
import { playThockSound, toggleSound } from '../../utils/audioEffects.ts';
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
  const [soundOn, setSoundOn] = useState(false);

  // 3D Interactive Parallax on the Code Window
  const [rotate, setRotate] = useState({ x: 10, y: -14 });
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const mockupRef = useRef<HTMLDivElement>(null);

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

  const handleSoundToggle = () => {
    const newState = toggleSound();
    setSoundOn(newState);
    if (newState) {
      playThockSound('run');
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!mockupRef.current) return;
    const rect = mockupRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotX = 10 - ((y - centerY) / centerY) * 10;
    const rotY = -14 + ((x - centerX) / centerX) * 12;

    setRotate({ x: rotX, y: rotY });
    setMousePos({
      x: Math.round((x / rect.width) * 100),
      y: Math.round((y / rect.height) * 100)
    });
  };

  const handleMouseLeave = () => {
    setRotate({ x: 10, y: -14 });
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

      {/* Cyber Background Grid & Ambient Glow Orbs */}
      <div className={styles.bgGrid} />
      <div className={styles.bgGlowOrb} />
      <div className={styles.bgGlowOrbSecondary} />

      {/* Top HUD Status Strip (YouTube Tech Edit Vibe) */}
      <div className={styles.hudStatusBar}>
        <div className={styles.hudLeft}>
          <div className={`${styles.hudItem} ${styles.hudItemActive}`}>
            <span className={styles.hudDotLive} />
            <span>MESH_STATUS: CONNECTED</span>
          </div>
          <div className={styles.hudItem}>
            <span>PROTOCOL: YJS_CRDT_V13</span>
          </div>
          <div className={styles.hudItem}>
            <span>LATENCY: 14ms (PEER_DIRECT)</span>
          </div>
        </div>

        <div className={styles.hudRight}>
          <button 
            className={`${styles.thockToggleBtn} ${soundOn ? styles.thockToggleBtnActive : ''}`}
            onClick={handleSoundToggle}
            title="Toggle synthesized mechanical switch sounds"
          >
            {soundOn ? <Volume2 size={12} /> : <VolumeX size={12} />}
            <span>THOCK: {soundOn ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </div>

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
          <a href="#terminal">Terminal</a>
          <a href="#features">Specs</a>
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
            <span>Built for student devs tired of Discord screen-share lag</span>
          </div>
        </div>

        <h1 className={styles.heroHeading}>
          Never debug code over <br />
          <span className={styles.heroGradient}>15 FPS screen shares again.</span>
        </h1>

        <p className={styles.heroSubtext}>
          Google Docs destroys indentation. VS Code Live Share requires 3 expiring logins. <br />
          <strong>Kollab</strong> gives you instant real-time cursor sync, folder drag-and-drop, and an in-browser runner.
          No accounts, zero waitlists, 100% free.
        </p>

        {/* Quick Launch Bar */}
        <div className={styles.quickBar}>
          <input
            type="text"
            className={styles.quickInput}
            placeholder="Enter your nickname (e.g. Rudranksh)..."
            value={displayName}
            onChange={(e) => {
              setDisplayName(e.target.value);
              playThockSound('key');
            }}
          />
          <button 
            className={styles.quickPrimaryBtn}
            onClick={() => {
              playThockSound('click');
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

        {/* 3D Cinematic Interactive Editor Mockup */}
        <div 
          id="editor"
          className={styles.perspectiveStage}
          ref={mockupRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* Floating 3D Glass Pill (Top Left) */}
          <div className={`${styles.floatingGlassBadge} ${styles.badgeTopLeft}`}>
            <Zap size={14} className={styles.badgeIconElectric} />
            <span>Yjs CRDT &bull; 0 Merge Conflicts</span>
          </div>

          {/* Floating 3D Collaborator Tag (Bottom Right) */}
          <div className={`${styles.floatingGlassBadge} ${styles.badgeBottomRight}`}>
            <span className={styles.collaboratorAvatar}>A</span>
            <div className={styles.collaboratorInfo}>
              <span className={styles.collaboratorName}>Alex</span>
              <span className={styles.collaboratorAction}>editing line 8 &bull; live</span>
            </div>
          </div>

          {/* The 3D Tilted Editor Window */}
          <div 
            className={styles.mockup3DWindow}
            style={{
              transform: `rotateX(${rotate.x}deg) rotateY(${rotate.y}deg) rotateZ(1.5deg)`,
              // Dynamic specular shine position
              ['--mouse-x' as string]: `${mousePos.x}%`,
              ['--mouse-y' as string]: `${mousePos.y}%`,
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

      {/* Relatable / Humanized Story Section */}
      <section id="story" className={styles.storySection}>
        <div className={styles.storyCard}>
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
        <div className={styles.sectionHeader}>
          <div className={styles.smallSubheader}>LIVE INTERACTIVE CLI</div>
          <h2>Test the engine directly in your browser</h2>
          <p>Type commands below or click the shortcut pills to test our system specs.</p>
        </div>

        <div className={styles.terminalCard}>
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
                  <div key={j} style={{ color: line.startsWith('  [') ? '#38BDF8' : '#94A3B8' }}>
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

      {/* Features / Architecture Specs */}
      <section id="features" className={styles.featuresSection}>
        <div className={styles.sectionHeader}>
          <div className={styles.smallSubheader}>TECHNICAL FOUNDATION</div>
          <h2>Built for real code, not toy snippets</h2>
          <p>Fast, lightweight, and engineered specifically for multi-file student collaboration.</p>
        </div>

        <div className={styles.featureCardsGrid}>
          <div className={styles.card}>
            <div className={styles.cardIcon}>
              <FolderTree size={20} />
            </div>
            <h3>Project Folder Drop</h3>
            <p>
              Drag &amp; drop an entire project folder from your computer. Kollab recursively maps your files 
              directly into browser memory without uploading your private code to third-party clouds.
            </p>
          </div>

          <div className={styles.card}>
            <div className={styles.cardIcon}>
              <Users size={20} />
            </div>
            <h3>Conflict-Free Yjs CRDT</h3>
            <p>
              Mathematical conflict-free replicated data types guarantee simultaneous edits never clash. 
              See real-time cursors, selection highlights, and active presence tags.
            </p>
          </div>

          <div className={styles.card}>
            <div className={styles.cardIcon}>
              <TerminalIcon size={20} />
            </div>
            <h3>In-Browser Runner &amp; REPL</h3>
            <p>
              Click ▶ Run to execute JavaScript and TypeScript in an isolated sandbox. Capture console output 
              and inspect errors together in real-time.
            </p>
          </div>

          <div className={styles.card}>
            <div className={styles.cardIcon}>
              <Shield size={20} />
            </div>
            <h3>Optional Room Passcode</h3>
            <p>
              Protect your hackathon session with bcrypt hashed passcodes. Keep unauthorized visitors out 
              while you and your team build in privacy.
            </p>
          </div>

          <div className={styles.card}>
            <div className={styles.cardIcon}>
              <Zap size={20} />
            </div>
            <h3>Throttling &amp; Rate Limits</h3>
            <p>
              Built-in sliding-window rate limiters prevent message flooding and runaway loops from crashing 
              the collaboration mesh.
            </p>
          </div>

          <div className={styles.card}>
            <div className={styles.cardIcon}>
              <Cpu size={20} />
            </div>
            <h3>100% Free Hosting Ready</h3>
            <p>
              Runs completely on SQLite, Express, and Vite. Zero paid API keys, zero cloud subscriptions, 
              ready to deploy for free on Render, Fly.io, or Railway.
            </p>
          </div>
        </div>
      </section>

      {/* 3-Step Workflow */}
      <section className={styles.workflowSection}>
        <div className={styles.sectionHeader}>
          <div className={styles.smallSubheader}>GET STARTED IN 10 SECONDS</div>
          <h2>How it works</h2>
        </div>

        <div className={styles.stepsGrid}>
          <div className={styles.stepCard}>
            <div className={styles.stepNumber}>01</div>
            <h3>Create a Room</h3>
            <p>Enter your name and pick a room name. No email, no password, no waitlist.</p>
          </div>
          <div className={styles.stepCard}>
            <div className={styles.stepNumber}>02</div>
            <h3>Drop Your Project</h3>
            <p>Drop your local project folder to populate the file tree, or start with a fresh file.</p>
          </div>
          <div className={styles.stepCard}>
            <div className={styles.stepNumber}>03</div>
            <h3>Share the 5-Digit ID</h3>
            <p>Send the room ID to your lab partners. Edit code together simultaneously with zero lag.</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={styles.ctaSection}>
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
            style={{ color: '#38BDF8', textDecoration: 'none', fontWeight: 600 }}
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
