import React, { useEffect, useState } from 'react';
import { AlertTriangle, Trash2, LogOut, X } from 'lucide-react';
import styles from './LastPersonLeaveModal.module.css';

interface LastPersonLeaveModalProps {
  isOpen: boolean;
  roomId: string;
  onConfirmLeave: () => void;
  onCancel: () => void;
}

export const LastPersonLeaveModal: React.FC<LastPersonLeaveModalProps> = ({
  isOpen,
  roomId,
  onConfirmLeave,
  onCancel,
}) => {
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsClosing(false);
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onCancel();
      setIsClosing(false);
    }, 180);
  };

  const handleConfirm = () => {
    setIsClosing(true);
    setTimeout(() => {
      onConfirmLeave();
      setIsClosing(false);
    }, 120);
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className={`${styles.backdrop} ${isClosing ? styles.backdropClosing : ''}`}
      onClick={handleClose}
    >
      <div
        className={`${styles.dialog} ${isClosing ? styles.dialogClosing : ''}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="last-person-leave-title"
      >
        <div className={styles.glowTop} />

        <button
          type="button"
          className={styles.closeBtn}
          onClick={handleClose}
          aria-label="Close"
          title="Stay in Room"
        >
          <X size={15} />
        </button>

        {/* Floating Animated Warning Badge */}
        <div className={styles.iconWrapper}>
          <div className={styles.pulseRing} />
          <div className={styles.iconBadge}>
            <AlertTriangle size={28} strokeWidth={2.2} />
          </div>
        </div>

        {/* Title & Description */}
        <h3 id="last-person-leave-title" className={styles.title}>
          Delete Room Permanently?
        </h3>
        <p className={styles.description}>
          You are the only person remaining in{' '}
          <span className={styles.roomHighlight}>{roomId}</span>. Leaving now will
          permanently delete this workspace and wipe all files and history.
        </p>

        {/* Warning Callout Box */}
        <div className={styles.warningBox}>
          <Trash2 size={16} className={styles.warningBoxIcon} />
          <p className={styles.warningBoxText}>
            <strong>Irreversible Action:</strong> When the last participant departs, the room is destroyed immediately.
          </p>
        </div>

        {/* Action Buttons */}
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={handleClose}
            autoFocus
          >
            Stay in Room
          </button>
          <button
            type="button"
            className={styles.confirmBtn}
            onClick={handleConfirm}
          >
            <LogOut size={15} />
            <span>Leave & Delete</span>
          </button>
        </div>
      </div>
    </div>
  );
};
