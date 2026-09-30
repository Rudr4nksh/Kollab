import React, { useState, useRef, useEffect } from 'react';
import { Terminal, Eye, Trash2, ChevronDown, ChevronUp, CornerDownLeft } from 'lucide-react';
import type { ConsoleLogItem, FileNode } from '../../types/index.ts';
import styles from './ConsolePanel.module.css';

interface ConsolePanelProps {
  logs: ConsoleLogItem[];
  onClearLogs: () => void;
  onExecuteCommand: (code: string) => void;
  files: FileNode[];
  activeFileContent?: string;
  isOpen: boolean;
  onToggleOpen: () => void;
}

export const ConsolePanel: React.FC<ConsolePanelProps> = ({
  logs,
  onClearLogs,
  onExecuteCommand,
  files,
  activeFileContent,
  isOpen,
  onToggleOpen,
}) => {
  const [tab, setTab] = useState<'output' | 'console' | 'preview'>('output');
  const [inputCommand, setInputCommand] = useState('');
  const [panelHeight] = useState(190);

  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    if (tab !== 'preview') {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, tab]);

  const handleSubmitCommand = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = inputCommand.trim();
    if (!cmd) return;
    onExecuteCommand(cmd);
    setInputCommand('');
  };

  // Build live HTML/CSS/JS preview iframe bundle
  const generatePreviewSrc = () => {
    let html = '<!DOCTYPE html><html><head><meta charset="utf-8">';
    let css = '';
    let js = '';

    const extractFiles = (nodes: FileNode[]) => {
      nodes.forEach((n) => {
        if (n.type === 'file') {
          if (n.name.endsWith('.html')) html += n.content || '';
          if (n.name.endsWith('.css')) css += n.content || '';
          if (n.name.endsWith('.js')) js += n.content || '';
        }
        if (n.children) extractFiles(n.children);
      });
    };
    extractFiles(files);

    // If no explicit index.html exists, use current active content
    if (!html.includes('<body') && activeFileContent) {
      html += `<body>${activeFileContent}</body>`;
    }

    return `
      ${html}
      <style>${css}</style>
      <script>
        try {
          ${js}
        } catch (err) {
          console.error("Preview Script Error:", err);
        }
      </script>
      </html>
    `;
  };

  if (!isOpen) {
    return (
      <div className={styles.collapsedBar} onClick={onToggleOpen}>
        <div className={styles.collapsedLeft}>
          <Terminal size={13} />
          <span>TERMINAL &amp; OUTPUT</span>
          {logs.length > 0 && <span className={styles.logCount}>{logs.length}</span>}
        </div>
        <button className={styles.expandBtn} title="Expand console">
          <ChevronUp size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className={styles.consolePanel} style={{ height: `${panelHeight}px` }}>
      {/* Header bar */}
      <div className={styles.header}>
        <div className={styles.tabsGroup}>
          <button
            className={`${styles.tabBtn} ${tab === 'output' ? styles.activeTab : ''}`}
            onClick={() => setTab('output')}
          >
            <Terminal size={12} />
            <span>OUTPUT</span>
          </button>
          <button
            className={`${styles.tabBtn} ${tab === 'console' ? styles.activeTab : ''}`}
            onClick={() => setTab('console')}
          >
            <Terminal size={12} />
            <span>CONSOLE</span>
          </button>
          <button
            className={`${styles.tabBtn} ${tab === 'preview' ? styles.activeTab : ''}`}
            onClick={() => setTab('preview')}
          >
            <Eye size={12} />
            <span>LIVE PREVIEW</span>
          </button>
        </div>

        <div className={styles.headerActions}>
          <button className={styles.actionBtn} onClick={onClearLogs} title="Clear logs">
            <Trash2 size={12} />
            <span>Clear</span>
          </button>
          <button className={styles.actionBtn} onClick={onToggleOpen} title="Minimize panel">
            <ChevronDown size={14} />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className={styles.contentBody}>
        {tab === 'output' && (
          <div className={styles.logList}>
            {logs.length === 0 ? (
              <div className={styles.emptyLogs}>
                <span>No output yet. Click ▶ Run in the top bar to execute code.</span>
              </div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className={`${styles.logLine} ${styles[log.type]}`}>
                  <span className={styles.logTime}>{log.timestamp}</span>
                  <span className={styles.logPrefix}>
                    {log.type === 'stdout' && '>'}
                    {log.type === 'stderr' && '✕'}
                    {log.type === 'info' && 'ℹ'}
                    {log.type === 'system' && '⚙'}
                    {log.type === 'result' && '←'}
                  </span>
                  <pre className={styles.logText}>{log.text}</pre>
                </div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>
        )}

        {tab === 'console' && (
          <div className={styles.interactiveConsole}>
            <div className={styles.logList}>
              {logs.map((log) => (
                <div key={log.id} className={`${styles.logLine} ${styles[log.type]}`}>
                  <span className={styles.logPrefix}>
                    {log.type === 'result' ? '←' : '>'}
                  </span>
                  <pre className={styles.logText}>{log.text}</pre>
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>

            {/* Input prompt */}
            <form onSubmit={handleSubmitCommand} className={styles.promptForm}>
              <span className={styles.promptSymbol}>&gt;</span>
              <input
                type="text"
                className={styles.promptInput}
                placeholder="Type JavaScript expression to evaluate... (e.g. 2 + 2, Math.PI, console.log('hi'))"
                value={inputCommand}
                onChange={(e) => setInputCommand(e.target.value)}
              />
              <button type="submit" className={styles.promptSubmit}>
                <CornerDownLeft size={12} />
              </button>
            </form>
          </div>
        )}

        {tab === 'preview' && (
          <div className={styles.previewContainer}>
            <iframe
              title="Live HTML Preview"
              sandbox="allow-scripts allow-modals"
              srcDoc={generatePreviewSrc()}
              className={styles.previewIframe}
            />
          </div>
        )}
      </div>
    </div>
  );
};
