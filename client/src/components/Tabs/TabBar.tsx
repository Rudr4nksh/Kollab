import React from 'react';
import { X, Play, Copy, Check } from 'lucide-react';
import type { FileNode } from '../../types/index.ts';
import { getFileBadgeInfo } from '../../services/fileUtils.ts';
import styles from './TabBar.module.css';

interface TabBarProps {
  openFiles: FileNode[];
  activeFilePath: string;
  onSelectTab: (file: FileNode) => void;
  onCloseTab: (path: string, e: React.MouseEvent) => void;
  onRunCode: () => void;
  onCopyCode: () => void;
  isRunning?: boolean;
}

export const TabBar: React.FC<TabBarProps> = ({
  openFiles,
  activeFilePath,
  onSelectTab,
  onCloseTab,
  onRunCode,
  onCopyCode,
  isRunning,
}) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    onCopyCode();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={styles.tabBar}>
      {/* Tabs Container */}
      <div className={styles.tabsContainer}>
        {openFiles.length === 0 ? (
          <span className={styles.emptyTabsHint}>No open tabs</span>
        ) : (
          openFiles.map((file) => {
            const isActive = file.path === activeFilePath;
            const badge = getFileBadgeInfo(file.name);

            return (
              <div
                key={file.path}
                className={`${styles.tab} ${isActive ? styles.activeTab : ''}`}
                onClick={() => onSelectTab(file)}
                title={file.path}
              >
                <span
                  className={styles.fileBadge}
                  style={{ color: badge.color, backgroundColor: badge.bg }}
                >
                  {badge.label}
                </span>
                <span className={styles.tabName}>{file.name}</span>
                <button
                  className={styles.closeTabBtn}
                  onClick={(e) => onCloseTab(file.path, e)}
                  title="Close tab"
                >
                  <X size={12} />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Action Buttons: Run & Copy */}
      <div className={styles.rightActions}>
        <button
          className={`${styles.runBtn} ${isRunning ? styles.running : ''}`}
          onClick={onRunCode}
          disabled={isRunning || openFiles.length === 0}
          title={openFiles.length === 0 ? 'No file open to run' : 'Run code in console (Ctrl+Enter)'}
        >
          <Play size={12} fill="currentColor" />
          <span>{isRunning ? 'Running...' : 'Run'}</span>
        </button>

        <button
          className={`${styles.copyBtn} ${copied ? styles.copied : ''}`}
          onClick={handleCopy}
          disabled={openFiles.length === 0}
          title={openFiles.length === 0 ? 'No file open to copy' : 'Copy file code'}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
    </div>
  );
};
