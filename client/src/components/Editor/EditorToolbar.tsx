import React, { useState } from 'react';
import { Copy, Check, Download } from 'lucide-react';
import type { SupportedLanguage } from '../../types/index.ts';
import styles from './EditorToolbar.module.css';

interface EditorToolbarProps {
  language: SupportedLanguage;
  onLanguageChange?: (language: SupportedLanguage) => void;
  onCopyCode: () => void;
  onDownloadCode?: () => void;
  cursorLine?: number;
  cursorColumn?: number;
  lineCount?: number;
  readOnly?: boolean;
}

const LANGUAGES: { id: SupportedLanguage; label: string }[] = [
  { id: 'html', label: 'HTML' },
  { id: 'javascript', label: 'JavaScript' },
  { id: 'typescript', label: 'TypeScript' },
  { id: 'python', label: 'Python' },
  { id: 'cpp', label: 'C++' },
  { id: 'java', label: 'Java' },
  { id: 'markdown', label: 'Markdown' },
  { id: 'plaintext', label: 'Plaintext' },
];

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  language,
  onCopyCode,
  onDownloadCode,
  cursorLine = 1,
  cursorColumn = 1,
  lineCount = 1,
}) => {
  const [copied, setCopied] = useState(false);

  const currentLangLabel = LANGUAGES.find((l) => l.id === language)?.label || language?.toUpperCase() || 'Code';

  const handleCopy = () => {
    onCopyCode();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={styles.toolbar}>
      <div className={styles.leftGroup}>
        <div className={styles.titleWrapper}>
          <span className={styles.editorTitle}>Editor</span>
        </div>

        <div className={styles.langBadgeWrapper}>
          <span className={styles.langBadge}>{currentLangLabel}</span>
        </div>
      </div>

      <div className={styles.rightGroup}>
        <div className={styles.stats}>
          <span className={styles.statItem}>
            Ln {cursorLine}, Col {cursorColumn}
          </span>
          <span className={styles.statDivider}>•</span>
          <span className={styles.statItem}>{lineCount} lines</span>
        </div>

        {onDownloadCode && (
          <button
            className={styles.iconBtn}
            onClick={onDownloadCode}
            title="Download file"
          >
            <Download size={13} />
          </button>
        )}

        <button
          className={`${styles.copyButton} ${copied ? styles.copied : ''}`}
          onClick={handleCopy}
          title="Copy code to clipboard"
        >
          {copied ? (
            <>
              <Check size={13} />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy size={13} />
              <span>Copy Code</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
