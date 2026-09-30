import React, { useState, useEffect, useRef } from 'react';
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
  threshold: number;
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
    glowColor: 'rgba(56, 189, 248, 0.35)',
    tagline: 'Zero cloud leaks. Instant local tree parsing.',
    description: 'Drop an entire project directory directly from your desktop. Files parse recursively into client memory without uploading private source code to external servers.',
    metrics: ['Zero cloud storage leaks', 'Recursive folder parsing', 'Instant multi-file tabs'],
    techSpecs: {
      engine: 'WebKit FileSystem API',
      guarantee: '100% Local In-Memory Parsing',
      protocol: 'Zero Cloud Storage'
    },
    nodeCoord: { x: 420, y: 130 },
    branchEnd: { x: 320, y: 130 },
    cardTop: 38,
    threshold: 0.12
  },
  {
    id: 'crdt',
    num: '02',
    side: 'right',
    title: 'Mathematical CRDT Sync',
    category: 'REAL-TIME STATE MESH',
    icon: <Zap size={16} />,
    color: '#8A4BFF',
    glowColor: 'rgba(138, 75, 255, 0.35)',
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
    cardTop: 278,
    threshold: 0.38
  },
  {
    id: 'runtime',
    num: '03',
    side: 'left',
    title: 'In-Browser V8 Sandbox',
    category: 'ISOLATED RUNTIME & REPL',
    icon: <Terminal size={16} />,
    color: '#10B981',
    glowColor: 'rgba(16, 185, 129, 0.35)',
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
    cardTop: 518,
    threshold: 0.62
  },
  {
    id: 'security',
    num: '04',
    side: 'right',
    title: 'Session Guard & Free Hosting',
    category: 'SECURITY & 100% FREE STACK',
    icon: <ShieldCheck size={16} />,
    color: '#F59E0B',
    glowColor: 'rgba(245, 158, 11, 0.35)',
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
    cardTop: 758,
    threshold: 0.85
  }
];

// Fluid S-curve path coordinating the 4 alternating nodes
const SERPENTINE_PATH = "M 500,20 C 460,60 420,90 420,130 C 420,250 580,250 580,370 C 580,490 420,490 420,610 C 420,730 580,730 580,850 C 580,890 540,920 500,950";

export const ProjectTreeMap: React.FC = () => {
  const [activeBranchId, setActiveBranchId] = useState<string>('files');
  const [scrollProgress, setScrollProgress] = useState<number>(0.15);
  const [isManuallySelected, setIsManuallySelected] = useState<boolean>(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const glowPathRef = useRef<SVGPathElement>(null);
  const sparkRef = useRef<SVGCircleElement>(null);

  // High-Performance Scroll-Driven Lighting Engine (0% Lag, GPU accelerated)
  useEffect(() => {
    let animId: number | null = null;
    let pathLength = 1250;

    if (glowPathRef.current) {
      try {
        pathLength = glowPathRef.current.getTotalLength() || 1250;
        glowPathRef.current.style.strokeDasharray = `${pathLength}`;
        glowPathRef.current.style.strokeDashoffset = `${pathLength}`;
      } catch (_) {}
    }

    const onScroll = () => {
      if (!wrapperRef.current) return;
      const rect = wrapperRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      // Calculate progress through this section (0.0 to 1.0)
      const startOffset = windowHeight * 0.75;
      const endOffset = windowHeight * 0.25;
      const totalDistance = rect.height + (startOffset - endOffset);
      const scrolled = startOffset - rect.top;
      const rawProgress = scrolled / totalDistance;
      const progress = Math.min(Math.max(rawProgress, 0), 1);

      if (glowPathRef.current) {
        const offset = pathLength * (1 - progress);
        glowPathRef.current.style.strokeDashoffset = `${offset}`;
      }

      if (sparkRef.current && glowPathRef.current) {
        try {
          const pt = glowPathRef.current.getPointAtLength(progress * pathLength);
          sparkRef.current.setAttribute('cx', `${pt.x}`);
          sparkRef.current.setAttribute('cy', `${pt.y}`);
          sparkRef.current.style.opacity = progress > 0.03 ? '1' : '0';
        } catch (_) {}
      }

      setScrollProgress(progress);

      // Auto-update focus node to the latest reached node unless user clicked one
      if (!isManuallySelected) {
        if (progress >= 0.82) {
          setActiveBranchId('security');
        } else if (progress >= 0.58) {
          setActiveBranchId('runtime');
        } else if (progress >= 0.32) {
          setActiveBranchId('crdt');
        } else {
          setActiveBranchId('files');
        }
      }
    };

    const requestScroll = () => {
      if (!animId) {
        animId = requestAnimationFrame(() => {
          onScroll();
          animId = null;
        });
      }
    };

    window.addEventListener('scroll', requestScroll, { passive: true });
    requestScroll();

    return () => {
      if (animId) cancelAnimationFrame(animId);
      window.removeEventListener('scroll', requestScroll);
    };
  }, [isManuallySelected]);

  const activeBranch = BRANCHES.find(b => b.id === activeBranchId) || BRANCHES[0];

  const handleSelectBranch = (id: string) => {
    playThockSound('click');
    setActiveBranchId(id);
    setIsManuallySelected(true);
  };

  return (
    <div ref={wrapperRef} className={styles.serpentineWrapper}>
      {/* Top Architecture Pill with Live Scroll Progress Indicator */}
      <div className={styles.topIndicatorRow}>
        <div className={styles.architecturePill}>
          <span className={styles.pulseDot} />
          <span>SCROLL-DRIVEN ARCHITECTURE MESH &bull; {Math.round(scrollProgress * 100)}% ENERGIZED</span>
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
              <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Glowing Gradient along the illuminated trunk */}
            <linearGradient id="illuminatedGradient" x1="500" y1="20" x2="500" y2="950" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="35%" stopColor="#8A4BFF" />
              <stop offset="70%" stopColor="#10B981" />
              <stop offset="100%" stopColor="#F59E0B" />
            </linearGradient>

            {/* Glowing Spark Particle */}
            <radialGradient id="sparkGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="40%" stopColor="#38BDF8" />
              <stop offset="80%" stopColor="#8A4BFF" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
          </defs>

          {/* 1. Inactive/Dormant Base Path (Dark subtle guide) */}
          <path 
            d={SERPENTINE_PATH} 
            stroke="rgba(255, 255, 255, 0.1)" 
            strokeWidth="3.5" 
            strokeLinecap="round" 
          />

          {/* 2. Scroll-Illuminated Glowing Path (progressively drawn by scroll) */}
          <path 
            ref={glowPathRef}
            d={SERPENTINE_PATH} 
            stroke="url(#illuminatedGradient)" 
            strokeWidth="4" 
            strokeLinecap="round" 
            className={styles.scrollGlowPath}
          />

          {/* 3. Leading Head Traveling Spark (Physically sits at scroll position) */}
          <circle 
            ref={sparkRef}
            r="7" 
            fill="url(#sparkGlow)" 
            filter="url(#nodeGlow)"
            className={styles.scrollSpark}
          />

          {/* 4. Horizontal Branches and Nodes (Light up when reached by scroll) */}
          {BRANCHES.map((b) => {
            const isReached = scrollProgress >= b.threshold;
            const isSelected = b.id === activeBranchId;
            const isLit = isReached || isSelected;

            return (
              <g key={b.id} className={styles.branchGroup} onClick={() => handleSelectBranch(b.id)}>
                {/* Horizontal branch line from node to card */}
                <line 
                  x1={b.nodeCoord.x} 
                  y1={b.nodeCoord.y} 
                  x2={b.branchEnd.x} 
                  y2={b.branchEnd.y} 
                  stroke={isLit ? b.color : "rgba(255, 255, 255, 0.12)"} 
                  strokeWidth={isLit ? 2.5 : 1.5} 
                  strokeDasharray={isLit ? "none" : "4 4"}
                  className={styles.branchLine}
                  style={{
                    filter: isLit ? `drop-shadow(0 0 6px ${b.color})` : 'none',
                    transition: 'all 350ms cubic-bezier(0.16, 1, 0.3, 1)'
                  }}
                />

                {/* Animated beam pulse when node is lit */}
                {isLit && (
                  <circle 
                    r="3.5" 
                    fill="#FFFFFF" 
                    filter="url(#nodeGlow)"
                  >
                    <animate 
                      attributeName="cx" 
                      from={b.nodeCoord.x} 
                      to={b.branchEnd.x} 
                      dur="1.5s" 
                      repeatCount="indefinite" 
                    />
                    <animate 
                      attributeName="cy" 
                      values={`${b.nodeCoord.y}; ${b.branchEnd.y}`} 
                      dur="1.5s" 
                      repeatCount="indefinite" 
                    />
                  </circle>
                )}

                {/* Outer Radar Beacon Ring */}
                <circle 
                  cx={b.nodeCoord.x} 
                  cy={b.nodeCoord.y} 
                  r={isLit ? 16 : 11} 
                  stroke={isLit ? b.color : "rgba(255, 255, 255, 0.2)"} 
                  strokeWidth={isLit ? 2 : 1} 
                  fill={isLit ? b.glowColor : "rgba(10, 13, 20, 0.8)"} 
                  className={isLit ? styles.activeBeaconRing : styles.beaconRing} 
                  style={{
                    transition: 'all 300ms ease'
                  }}
                />

                {/* Core Solid Node Point */}
                <circle 
                  cx={b.nodeCoord.x} 
                  cy={b.nodeCoord.y} 
                  r={isLit ? 6 : 4} 
                  fill={isLit ? b.color : "#4B5563"} 
                  filter={isLit ? "url(#nodeGlow)" : undefined} 
                  style={{
                    transition: 'all 300ms ease'
                  }}
                />

                {/* Node Number Label */}
                <text 
                  x={b.side === 'left' ? b.nodeCoord.x + 20 : b.nodeCoord.x - 20} 
                  y={b.nodeCoord.y + 4} 
                  textAnchor={b.side === 'left' ? 'start' : 'end'} 
                  fill={isLit ? '#FFFFFF' : '#4B5563'} 
                  fontFamily="var(--font-mono)" 
                  fontSize="11" 
                  fontWeight="700" 
                  className={styles.nodeLabel}
                  style={{
                    transition: 'fill 250ms ease'
                  }}
                >
                  {b.num}
                </text>
              </g>
            );
          })}
        </svg>

        {/* DOM Cards Overlay (Physically aligned with the branches, lights up on scroll) */}
        <div className={styles.cardsOverlay}>
          {BRANCHES.map((b) => {
            const isReached = scrollProgress >= b.threshold;
            const isSelected = b.id === activeBranchId;
            const isLit = isReached || isSelected;

            return (
              <div 
                key={b.id} 
                className={`${styles.serpentineCard} ${b.side === 'left' ? styles.cardLeft : styles.cardRight} ${isLit ? styles.cardLit : styles.cardDormant} ${isSelected ? styles.cardSelected : ''}`}
                style={{ 
                  top: `${b.cardTop}px`,
                  borderColor: isLit ? b.color : undefined
                }}
                onClick={() => handleSelectBranch(b.id)}
              >
                <div className={styles.cardHeader}>
                  <div 
                    className={styles.cardIconBox} 
                    style={{ 
                      color: isLit ? b.color : '#6B7280', 
                      backgroundColor: isLit ? `${b.color}20` : 'rgba(255, 255, 255, 0.05)' 
                    }}
                  >
                    {b.icon}
                  </div>
                  <div className={styles.cardMeta}>
                    <span 
                      className={styles.cardCategory} 
                      style={{ color: isLit ? b.color : '#6B7280' }}
                    >
                      {b.category}
                    </span>
                    <h3 className={styles.cardTitle}>{b.title}</h3>
                  </div>
                </div>

                <p className={styles.cardDesc}>{b.description}</p>

                <div className={styles.cardMetricsList}>
                  {b.metrics.map((m, i) => (
                    <div key={i} className={styles.metricPill}>
                      <CheckCircle2 size={11} style={{ color: isLit ? b.color : '#4B5563' }} />
                      <span style={{ color: isLit ? '#D1D5DB' : '#6B7280' }}>{m}</span>
                    </div>
                  ))}
                </div>

                {isLit && (
                  <div className={styles.activeTagBadge} style={{ borderColor: b.color, color: b.color }}>
                    <Sparkles size={11} />
                    <span>{isSelected ? 'CURRENT INSPECTION FOCUS' : 'SYSTEM ENERGIZED'}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Subsystem Architecture Inspector Panel */}
      <div className={styles.inspectorPanel}>
        <div className={styles.inspectorHeader}>
          <div className={styles.inspectorLeft}>
            <div className={styles.inspectorBadge} style={{ color: activeBranch.color, borderColor: activeBranch.color }}>
              <span>ACTIVE SUBSYSTEM {activeBranch.num}</span>
            </div>
            <h4>{activeBranch.title} &bull; Verified Specifications</h4>
          </div>
          <div className={styles.inspectorTagline}>
            {activeBranch.tagline}
          </div>
        </div>

        <div className={styles.inspectorGrid}>
          <div className={styles.specBox}>
            <span className={styles.specLabel}>Underlying Architecture</span>
            <span className={styles.specValue}>{activeBranch.techSpecs.engine}</span>
          </div>
          <div className={styles.specBox}>
            <span className={styles.specLabel}>Engine Guarantee</span>
            <span className={styles.specValue} style={{ color: activeBranch.color }}>
              {activeBranch.techSpecs.guarantee}
            </span>
          </div>
          <div className={styles.specBox}>
            <span className={styles.specLabel}>Mesh Transport Protocol</span>
            <span className={styles.specValue}>{activeBranch.techSpecs.protocol}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
