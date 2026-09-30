import React, { useState } from 'react';
import { 
  FolderTree, 
  Zap, 
  Terminal, 
  ShieldCheck, 
  CheckCircle2, 
  Sparkles
} from 'lucide-react';
import { playThockSound } from '../../utils/audioEffects.ts';
import styles from './ProjectTreeMap.module.css';

interface BranchNode {
  id: string;
  num: string;
  side: 'left' | 'right';
  title: string;
  category: string;
  icon: React.ReactNode;
  color: string;
  glowColor: string;
  tagline: string;
  description: string;
  metrics: string[];
  techSpecs: {
    engine: string;
    guarantee: string;
    protocol: string;
  };
  nodeCoord: { x: number; y: number };
  branchEnd: { x: number; y: number };
  cardTop: number;
}

const BRANCHES: BranchNode[] = [
  {
    id: 'files',
    num: '01',
    side: 'left',
    title: 'Native Folder Drag & Drop',
    category: 'IN-MEMORY FILE TREE',
    icon: <FolderTree size={16} />,
    color: '#38BDF8',
    glowColor: 'rgba(56, 189, 248, 0.25)',
    tagline: 'Zero cloud leaks. Instant local tree parsing.',
    description: 'Drop any project directory directly from your desktop. Files parse recursively into client memory without uploading private source code to external servers.',
    metrics: ['Zero cloud storage leaks', 'Recursive folder parsing', 'Instant multi-file tabs'],
    techSpecs: {
      engine: 'WebKit FileSystem API',
      guarantee: '100% Local In-Memory Parsing',
      protocol: 'Zero Cloud Storage'
    },
    nodeCoord: { x: 420, y: 130 },
    branchEnd: { x: 320, y: 130 },
    cardTop: 38
  },
  {
    id: 'crdt',
    num: '02',
    side: 'right',
    title: 'Mathematical CRDT Sync',
    category: 'REAL-TIME STATE MESH',
    icon: <Zap size={16} />,
    color: '#8A4BFF',
    glowColor: 'rgba(138, 75, 255, 0.25)',
    tagline: 'Conflict-free replicated data types with colored cursors.',
    description: 'Powered by Yjs CRDTs. When two developers type simultaneously on the same line, mathematical convergence guarantees zero merge conflicts or wiped code.',
    metrics: ['Sub-15ms WebSocket sync', 'Colored collaborator cursors', 'Awareness presence tags'],
    techSpecs: {
      engine: 'Yjs CRDT + lib0 binary protocol',
      guarantee: '0 Merge Conflicts Ever',
      protocol: 'Socket.IO Mesh Transport'
    },
    nodeCoord: { x: 580, y: 370 },
    branchEnd: { x: 680, y: 370 },
    cardTop: 278
  },
  {
    id: 'runtime',
    num: '03',
    side: 'left',
    title: 'In-Browser V8 Sandbox',
    category: 'ISOLATED RUNTIME & REPL',
    icon: <Terminal size={16} />,
    color: '#10B981',
    glowColor: 'rgba(16, 185, 129, 0.25)',
    tagline: 'Execute JS and TS right in the browser sandbox.',
    description: 'Click ▶ Run to evaluate code in an isolated V8 client sandbox. Standard output, errors, and return values stream live to all active collaborators simultaneously.',
    metrics: ['Zero backend execution costs', 'Live shared console log stream', 'Runtime error stack tracing'],
    techSpecs: {
      engine: 'Isolated Web Worker Sandbox',
      guarantee: 'Safe client-side execution',
      protocol: 'Shared Console Output Broadcast'
    },
    nodeCoord: { x: 420, y: 610 },
    branchEnd: { x: 320, y: 610 },
    cardTop: 518
  },
  {
    id: 'security',
    num: '04',
    side: 'right',
    title: 'Session Guard & Free Hosting',
    category: 'SECURITY & 100% FREE STACK',
    icon: <ShieldCheck size={16} />,
    color: '#F59E0B',
    glowColor: 'rgba(245, 158, 11, 0.25)',
    tagline: 'Bcrypt room passcodes and sliding-window rate limiters.',
    description: 'Protect private hackathon sessions with salted bcrypt room passcodes. Built completely with SQLite and Express for 100% free deployment on Render or Railway.',
    metrics: ['Salted bcrypt passcode verification', 'Sliding-window DDoS throttling', 'SQLite zero-dollar deployment'],
    techSpecs: {
      engine: 'SQLite via Prisma ORM',
      guarantee: '100% Free Hosting Stack',
      protocol: 'Bcrypt Hash Auth + Leaky-Bucket Throttling'
    },
    nodeCoord: { x: 580, y: 850 },
    branchEnd: { x: 680, y: 850 },
    cardTop: 758
  }
];

// Fluid S-curve path coordinating the 4 alternating nodes
const SERPENTINE_PATH = "M 500,20 C 460,60 420,90 420,130 C 420,250 580,250 580,370 C 580,490 420,490 420,610 C 420,730 580,730 580,850 C 580,890 540,920 500,950";

export const ProjectTreeMap: React.FC = () => {
  const [activeBranchId, setActiveBranchId] = useState<string>('crdt');

  const activeBranch = BRANCHES.find(b => b.id === activeBranchId) || BRANCHES[1];

  const handleSelectBranch = (id: string) => {
    playThockSound('click');
    setActiveBranchId(id);
  };

  return (
    <div className={styles.serpentineWrapper}>
      {/* Top Architecture Pill */}
      <div className={styles.topIndicatorRow}>
        <div className={styles.architecturePill}>
          <span className={styles.pulseDot} />
          <span>SERPENTINE ARCHITECTURE FLOW &bull; CONTINUOUS 2D STATE MESH</span>
        </div>
      </div>

      {/* Main 2D Serpentine Canvas Stage */}
      <div className={styles.canvasStage}>
        {/* SVG Serpentine Trunk & Branch Lines */}
        <svg 
          className={styles.serpentineSvg} 
          viewBox="0 0 1000 970" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Soft Glow Filter */}
            <filter id="nodeGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Gradient along the trunk */}
            <linearGradient id="trunkGradient" x1="500" y1="20" x2="500" y2="950" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="35%" stopColor="#8A4BFF" />
              <stop offset="70%" stopColor="#10B981" />
              <stop offset="100%" stopColor="#F59E0B" />
            </linearGradient>

            {/* Glowing particle gradient */}
            <radialGradient id="particleGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="60%" stopColor="#A78BFA" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
          </defs>

          {/* 1. Base Subtle Serpentine Trunk */}
          <path 
            d={SERPENTINE_PATH} 
            stroke="rgba(255, 255, 255, 0.12)" 
            strokeWidth="3" 
            strokeLinecap="round" 
          />

          {/* 2. Animated Pulsing Overlay Stroke */}
          <path 
            d={SERPENTINE_PATH} 
            stroke="url(#trunkGradient)" 
            strokeWidth="3" 
            strokeDasharray="12 10" 
            className={styles.animatedStrokePulse} 
            strokeLinecap="round" 
          />

          {/* 3. Luminous Traveling Particle along the Serpentine Path */}
          <circle r="5" fill="url(#particleGlow)" filter="url(#nodeGlow)">
            <animateMotion 
              path={SERPENTINE_PATH} 
              dur="6s" 
              repeatCount="indefinite" 
            />
          </circle>

          {/* 4. Horizontal Branches and Nodes */}
          {BRANCHES.map((b) => {
            const isSelected = b.id === activeBranchId;
            return (
              <g key={b.id} className={styles.branchGroup} onClick={() => handleSelectBranch(b.id)}>
                {/* Horizontal branch line to card */}
                <line 
                  x1={b.nodeCoord.x} 
                  y1={b.nodeCoord.y} 
                  x2={b.branchEnd.x} 
                  y2={b.branchEnd.y} 
                  stroke={isSelected ? b.color : "rgba(255, 255, 255, 0.18)"} 
                  strokeWidth={isSelected ? 2.5 : 1.5} 
                  strokeDasharray={isSelected ? "none" : "4 4"}
                  className={styles.branchLine}
                />

                {/* Animated pulse dot along the horizontal connector */}
                {isSelected && (
                  <circle 
                    r="3.5" 
                    fill={b.color} 
                    filter="url(#nodeGlow)"
                  >
                    <animate 
                      attributeName={b.side === 'left' ? "cx" : "cx"} 
                      from={b.nodeCoord.x} 
                      to={b.branchEnd.x} 
                      dur="1.2s" 
                      repeatCount="indefinite" 
                    />
                    <animate 
                      attributeName="cy" 
                      values={`${b.nodeCoord.y}; ${b.branchEnd.y}`} 
                      dur="1.2s" 
                      repeatCount="indefinite" 
                    />
                  </circle>
                )}

                {/* Outer Radar Beacon Ring */}
                <circle 
                  cx={b.nodeCoord.x} 
                  cy={b.nodeCoord.y} 
                  r={isSelected ? 16 : 12} 
                  stroke={b.color} 
                  strokeWidth="1.5" 
                  fill={isSelected ? b.glowColor : "rgba(10, 13, 20, 0.7)"} 
                  className={isSelected ? styles.activeBeaconRing : styles.beaconRing} 
                />

                {/* Core Solid Node Point */}
                <circle 
                  cx={b.nodeCoord.x} 
                  cy={b.nodeCoord.y} 
                  r="5" 
                  fill={b.color} 
                  filter={isSelected ? "url(#nodeGlow)" : undefined} 
                />

                {/* Node Number Label */}
                <text 
                  x={b.side === 'left' ? b.nodeCoord.x + 18 : b.nodeCoord.x - 18} 
                  y={b.nodeCoord.y + 4} 
                  textAnchor={b.side === 'left' ? 'start' : 'end'} 
                  fill={isSelected ? '#FFFFFF' : '#6B7280'} 
                  fontFamily="var(--font-mono)" 
                  fontSize="10.5" 
                  fontWeight="700" 
                  className={styles.nodeLabel}
                >
                  {b.num}
                </text>
              </g>
            );
          })}
        </svg>

        {/* DOM Cards Absolutely Positioned at Branch Ends */}
        <div className={styles.cardsOverlay}>
          {BRANCHES.map((b) => {
            const isSelected = b.id === activeBranchId;
            return (
              <div 
                key={b.id} 
                className={`${styles.serpentineCard} ${b.side === 'left' ? styles.cardLeft : styles.cardRight} ${isSelected ? styles.cardSelected : ''}`}
                style={{ top: `${b.cardTop}px` }}
                onClick={() => handleSelectBranch(b.id)}
              >
                <div className={styles.cardHeader}>
                  <div className={styles.cardIconBox} style={{ color: b.color, backgroundColor: `${b.color}18` }}>
                    {b.icon}
                  </div>
                  <div className={styles.cardMeta}>
                    <span className={styles.cardCategory} style={{ color: b.color }}>{b.category}</span>
                    <h3 className={styles.cardTitle}>{b.title}</h3>
                  </div>
                </div>

                <p className={styles.cardDesc}>{b.description}</p>

                <div className={styles.cardMetricsList}>
                  {b.metrics.map((m, i) => (
                    <div key={i} className={styles.metricPill}>
                      <CheckCircle2 size={11} style={{ color: b.color }} />
                      <span>{m}</span>
                    </div>
                  ))}
                </div>

                {isSelected && (
                  <div className={styles.activeTagBadge} style={{ borderColor: b.color, color: b.color }}>
                    <Sparkles size={11} />
                    <span>ACTIVE INSPECTION FOCUS</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Node Deep Inspector Panel */}
      <div className={styles.inspectorPanel}>
        <div className={styles.inspectorHeader}>
          <div className={styles.inspectorLeft}>
            <div className={styles.inspectorBadge} style={{ color: activeBranch.color, borderColor: activeBranch.color }}>
              <span>SUBSYSTEM {activeBranch.num}</span>
            </div>
            <h4>{activeBranch.title} &bull; Architecture Verification</h4>
          </div>
          <div className={styles.inspectorTagline}>
            {activeBranch.tagline}
          </div>
        </div>

        <div className={styles.inspectorGrid}>
          <div className={styles.specBox}>
            <span className={styles.specLabel}>Underlying Engine</span>
            <span className={styles.specValue}>{activeBranch.techSpecs.engine}</span>
          </div>
          <div className={styles.specBox}>
            <span className={styles.specLabel}>System Guarantee</span>
            <span className={styles.specValue} style={{ color: activeBranch.color }}>
              {activeBranch.techSpecs.guarantee}
            </span>
          </div>
          <div className={styles.specBox}>
            <span className={styles.specLabel}>Network Protocol</span>
            <span className={styles.specValue}>{activeBranch.techSpecs.protocol}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
