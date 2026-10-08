import React from 'react';
import { Check, X, Copy, Sparkles, FileCode, ArrowRight, ShieldCheck } from 'lucide-react';
import type { AIProposal } from '../../types/index.ts';
import styles from './AIDiffReviewModal.module.css';

interface AIDiffReviewModalProps {
  proposal: AIProposal | null;
  onApply: (proposal: AIProposal) => void;
  onDismiss: () => void;
}

export const AIDiffReviewModal: React.FC<AIDiffReviewModalProps> = ({
  proposal,
  onApply,
  onDismiss,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!proposal) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(proposal.proposedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={styles.overlay} onClick={onDismiss}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.aiBadge}>
              <Sparkles size={14} className={styles.sparkleIcon} />
              <span>AI Code Review</span>
            </div>
            <div className={styles.filePill}>
              <FileCode size={13} />
              <span>{proposal.filePath}</span>
            </div>
            <span className={styles.userAttribution}>
              Requested by <strong>{proposal.requestedBy}</strong>
            </span>
          </div>

          <button className={styles.closeBtn} onClick={onDismiss} title="Close review">
            <X size={16} />
          </button>
        </div>

        {/* Explanation Banner */}
        {proposal.explanation && (
          <div className={styles.explanationBanner}>
            <p>{proposal.explanation}</p>
          </div>
        )}

        {/* Code Comparison (Current vs Proposed) */}
        <div className={styles.diffContainer}>
          <div className={styles.diffPane}>
            <div className={`${styles.diffPaneHeader} ${styles.paneCurrent}`}>
              <span>Current Code</span>
              <span className={styles.lineCount}>
                {proposal.originalCode.split('\n').length} lines
              </span>
            </div>
            <pre className={styles.codeBlock}>
              <code>{proposal.originalCode || '(Empty file)'}</code>
            </pre>
          </div>

          <div className={styles.diffDivider}>
            <ArrowRight size={16} />
          </div>

          <div className={styles.diffPane}>
            <div className={`${styles.diffPaneHeader} ${styles.paneProposed}`}>
              <span>AI Proposed Code</span>
              <span className={styles.lineCount}>
                {proposal.proposedCode.split('\n').length} lines
              </span>
            </div>
            <pre className={`${styles.codeBlock} ${styles.proposedCodeBlock}`}>
              <code>{proposal.proposedCode}</code>
            </pre>
          </div>
        </div>

        {/* Footer Actions */}
        <div className={styles.footer}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <ShieldCheck size={13} />
              Changes merge safely into multiplayer session upon applying.
            </span>

          <div className={styles.actionButtons}>
            <button type="button" className={styles.copyBtn} onClick={handleCopy}>
              <Copy size={14} />
              <span>{copied ? 'Copied!' : 'Copy Code'}</span>
            </button>

            <button type="button" className={styles.dismissBtn} onClick={onDismiss}>
              <X size={14} />
              <span>Dismiss</span>
            </button>

            <button
              type="button"
              className={styles.applyBtn}
              onClick={() => onApply(proposal)}
            >
              <Check size={15} />
              <span>Apply to {proposal.filePath.split('/').pop()}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
