import React, { useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
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
    }, 120);
  };

  const handleConfirm = () => {
    setIsClosing(true);
    setTimeout(() => {
      onConfirmLeave();
      setIsClosing(false);
    }, 100);
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
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="last-person-leave-title"
      >
        <div className={styles.headerRow}>
          <div className={styles.iconBox}>
            <AlertTriangle size={17} strokeWidth={2.2} />
          </div>
          <div className={styles.titleArea}>
            <h3 id="last-person-leave-title" className={styles.title}>
              Delete workspace?
            </h3>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={handleClose}
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>

        <p className={styles.body}>
          You are the only person left in{' '}
          <span className={styles.roomIdBadge}>{roomId}</span>. Leaving now will
          permanently delete this workspace and all files inside it.
        </p>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={handleClose}
            autoFocus
          >
            Cancel
          </button>
          <button
            type="button"
            className={styles.deleteBtn}
            onClick={handleConfirm}
          >
            Delete & Leave
          </button>
        </div>
      </div>
    </div>
  );
};
