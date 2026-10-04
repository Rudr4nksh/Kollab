import React, { useEffect, useState } from 'react';
import { X, Trash2, LogOut } from 'lucide-react';
import { Button } from './Button.tsx';
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
    }, 140);
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
        role="dialog"
        aria-modal="true"
        aria-labelledby="last-person-leave-title"
      >
        {/* Modal Window Header */}
        <div className={styles.header}>
          <div className={styles.titleArea}>
            <span className={styles.statusDot} />
            <h3 id="last-person-leave-title" className={styles.title}>
              Leave Workspace
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

        {/* Modal Window Body */}
        <div className={styles.body}>
          <p className={styles.message}>
            You are the last person in <span className={styles.roomTag}>{roomId}</span>. Leaving now will permanently delete this room from the server and purge all workspace files.
          </p>

          <div className={styles.warningCallout}>
            <Trash2 size={14} className={styles.calloutIcon} />
            <p className={styles.calloutText}>
              This room will be permanently destroyed once you depart.
            </p>
          </div>
        </div>

        {/* Modal Window Footer */}
        <div className={styles.footer}>
          <Button variant="secondary" size="md" onClick={handleClose} autoFocus>
            Cancel
          </Button>
          <Button
            variant="danger"
            size="md"
            icon={<LogOut size={13} />}
            onClick={handleConfirm}
          >
            Delete & Leave
          </Button>
        </div>
      </div>
    </div>
  );
};
