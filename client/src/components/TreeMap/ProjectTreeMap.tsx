import React, { useState } from 'react';
import { 
  FolderTree, 
  FileCode, 
  Zap, 
  Terminal, 
  ShieldCheck, 
  GitBranch
} from 'lucide-react';
import styles from './ProjectTreeMap.module.css';

export const ProjectTreeMap: React.FC = () => {
  const [selectedNode, setSelectedNode] = useState<string>('crdt');

  const categories = [
    {
      id: 'files',
      title: 'Local Workspace Tree',
      icon: <FolderTree size={16} />,
      color: '#38BDF8',
      nodes: [
        {
          id: 'folder-drop',
          label: 'project_folder/',
          sub: 'Direct Desktop Drop',
          tag: 'Drag & Drop',
          desc: 'Drop any React, Vite, or Python directory. Kollab maps the entire directory tree directly in browser memory without sending private files to third-party cloud servers.',
          meta: ['Zero cloud storage leaks', 'Recursive directory parsing', 'Instant multi-file tabs']
        },
        {
          id: 'file-tabs',
          label: 'workspace_tabs.tsx',
          sub: 'Multi-File Switching',
          tag: 'Tab Engine',
          desc: 'Switch between components, styles, and configs with floating file badges, keyboard shortcuts, and unsaved change indicators.',
          meta: ['Syntax detection', 'Fast buffer switching', 'Independent cursor memory']
        }
      ]
    },
    {
      id: 'crdt',
      title: 'Real-Time Sync Engine',
      icon: <Zap size={16} />,
      color: '#2F81F7',
      nodes: [
        {
          id: 'yjs-mesh',
          label: 'crdt_engine.wasm',
          sub: 'Yjs Mathematical Sync',
          tag: '0 Conflict Mesh',
          desc: 'Conflict-Free Replicated Data Types guarantee that two classmates typing on the exact same line never overwrite or wipe out code.',
          meta: ['State vector compression', 'Sub-15ms WebSocket propagation', 'Local-first offline fallback']
        },
        {
          id: 'presence',
          label: 'collaborator_presence.ts',
          sub: 'Live Colored Cursors',
          tag: 'Awareness API',
          desc: 'Broadcasts exact cursor positions, line selections, and active typing status. See who is writing where with real-time colored indicators.',
          meta: ['Multi-cursor rendering', 'Selection highlights', 'Auto host re-assignment']
        }
      ]
    },
    {
      id: 'runtime',
      title: 'Isolated Execution',
      icon: <Terminal size={16} />,
      color: '#10B981',
      nodes: [
        {
          id: 'runner',
          label: 'sandbox_runner.js',
          sub: 'In-Browser V8 Execution',
          tag: '▶ Run Engine',
          desc: 'Hit Run to execute JavaScript and TypeScript right inside an isolated web sandbox. Debug logic errors and test algorithms together.',
          meta: ['Console log interception', 'Runtime error stack traces', 'Interactive live REPL']
        },
        {
          id: 'console-logs',
          label: 'stream_logs.sh',
          sub: 'Shared Debug Feed',
          tag: 'Live Output',
          desc: 'All connected peers see standard output and execution results simultaneously in the collapsible bottom console panel.',
          meta: ['Live stream output', 'Error highlights', 'Execution timing telemetry']
        }
      ]
    },
    {
      id: 'security',
      title: 'Privacy & Guardrails',
      icon: <ShieldCheck size={16} />,
      color: '#A855F7',
      nodes: [
        {
          id: 'passcode',
          label: 'room_passcode.hash',
          sub: 'Bcrypt Encryption',
          tag: 'Optional Gate',
          desc: 'Set an optional room password to lock out unwanted guests during hackathons. Passcodes are hashed with bcrypt before verification.',
          meta: ['Salted Bcrypt hashing', 'Unauthorized disconnects', 'Private room isolation']
        },
        {
          id: 'throttling',
          label: 'rate_limiter.ts',
          sub: 'DoS & Flood Guard',
          tag: 'Sliding Window',
          desc: 'Server-side sliding window token bucket limits incoming WebSocket messages to 5/sec per client, protecting against rogue loops.',
          meta: ['1MB document limit', 'Infinite loop protection', '100% Free SQLite backend']
        }
      ]
    }
  ];

  // Find active node data for the inspector panel
  let activeData = {
    title: 'crdt_engine.wasm',
    category: 'Real-Time Sync Engine',
    desc: 'Conflict-Free Replicated Data Types guarantee simultaneous edits never conflict or overwrite code.',
    meta: ['State vector compression', 'Sub-15ms WebSocket propagation', 'Local-first offline fallback'],
    tag: '0 Conflict Mesh',
    color: '#2F81F7'
  };

  for (const cat of categories) {
    for (const node of cat.nodes) {
      if (node.id === selectedNode) {
        activeData = {
          title: node.label,
          category: cat.title,
          desc: node.desc,
          meta: node.meta,
          tag: node.tag,
          color: cat.color
        };
      }
    }
  }

  return (
    <div className={styles.treeMapWrapper}>
      {/* Visual Tree Map Grid */}
      <div className={styles.treeCanvasContainer}>
        {/* Root Node: Kollab Project Spine */}
        <div className={styles.rootNodeRow}>
          <div className={styles.rootNodeBadge}>
            <div className={styles.rootIconPulse}>
              <GitBranch size={16} />
            </div>
            <div className={styles.rootInfo}>
              <span className={styles.rootSub}>WORKSPACE ROOT</span>
              <span className={styles.rootTitle}>kollab://project-core</span>
            </div>
            <span className={styles.liveMeshPill}>4 SUBSYSTEMS ONLINE</span>
          </div>
        </div>

        {/* Tree Branch Visual Connector SVG */}
        <div className={styles.svgBranchWrapper}>
          <svg className={styles.branchSvg} viewBox="0 0 800 60" preserveAspectRatio="none">
            <line x1="400" y1="0" x2="400" y2="30" stroke="#30363D" strokeWidth="2" />
            <line x1="100" y1="30" x2="700" y2="30" stroke="#30363D" strokeWidth="2" />
            <line x1="100" y1="30" x2="100" y2="60" stroke="#38BDF8" strokeWidth="2" strokeDasharray="4 4" className={styles.pulsePath} />
            <line x1="300" y1="30" x2="300" y2="60" stroke="#2F81F7" strokeWidth="2" strokeDasharray="4 4" className={styles.pulsePath} />
            <line x1="500" y1="30" x2="500" y2="60" stroke="#10B981" strokeWidth="2" strokeDasharray="4 4" className={styles.pulsePath} />
            <line x1="700" y1="30" x2="700" y2="60" stroke="#A855F7" strokeWidth="2" strokeDasharray="4 4" className={styles.pulsePath} />
          </svg>
        </div>

        {/* The 4 Category Branches */}
        <div className={styles.branchesGrid}>
          {categories.map((cat) => (
            <div key={cat.id} className={styles.branchColumn}>
              {/* Category Header Node */}
              <div className={styles.categoryHeader} style={{ borderColor: `${cat.color}40` }}>
                <span className={styles.categoryIcon} style={{ color: cat.color }}>{cat.icon}</span>
                <span className={styles.categoryTitle}>{cat.title}</span>
              </div>

              {/* Leaf Nodes */}
              <div className={styles.leafNodesList}>
                {cat.nodes.map((node) => {
                  const isSelected = selectedNode === node.id;
                  return (
                    <div
                      key={node.id}
                      className={`${styles.leafCard} ${isSelected ? styles.leafCardSelected : ''}`}
                      onClick={() => setSelectedNode(node.id)}
                      style={{
                        borderColor: isSelected ? cat.color : undefined,
                        boxShadow: isSelected ? `0 0 20px ${cat.color}25` : undefined
                      }}
                    >
                      <div className={styles.leafTop}>
                        <div className={styles.leafFileBadge}>
                          <FileCode size={13} style={{ color: cat.color }} />
                          <span className={styles.leafFilename}>{node.label}</span>
                        </div>
                        <span className={styles.leafTag} style={{ color: cat.color, backgroundColor: `${cat.color}15` }}>
                          {node.tag}
                        </span>
                      </div>
                      <div className={styles.leafSub}>{node.sub}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive Detail Inspector Panel */}
      <div className={styles.nodeInspectorPanel} style={{ borderTopColor: activeData.color }}>
        <div className={styles.inspectorHeader}>
          <div className={styles.inspectorTitleGroup}>
            <span className={styles.inspectorCatTag} style={{ color: activeData.color }}>
              SUBSYSTEM &bull; {activeData.category}
            </span>
            <h3 className={styles.inspectorTitle}>{activeData.title}</h3>
          </div>
          <span className={styles.inspectorBadge} style={{ borderColor: activeData.color, color: activeData.color }}>
            {activeData.tag}
          </span>
        </div>

        <p className={styles.inspectorDesc}>{activeData.desc}</p>

        <div className={styles.inspectorMetaGrid}>
          {activeData.meta.map((item, idx) => (
            <div key={idx} className={styles.metaItem}>
              <span className={styles.metaDot} style={{ backgroundColor: activeData.color }} />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
