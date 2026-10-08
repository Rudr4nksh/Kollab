import React, { useEffect } from 'react';
import { AlertTriangle, UserX, Crown } from 'lucide-react';
import styles from './ConfirmModal.module.css';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  confirmVariant?: 'danger' | 'primary' | 'warning';
  cancelText?: string;
  icon?: 'kick' | 'transfer' | 'warning';
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  confirmVariant = 'danger',
  cancelText = 'Cancel',
  icon = 'warning',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div
            className={`${styles.iconWrap} ${
              confirmVariant === 'warning' || icon === 'transfer' ? styles.iconWrapWarning : ''
            }`}
          >
            {icon === 'kick' ? (
              <UserX size={18} />
            ) : icon === 'transfer' ? (
              <Crown size={18} />
            ) : (
              <AlertTriangle size={18} />
            )}
          </div>
          <h3 className={styles.title}>{title}</h3>
        </div>

        <div className={styles.body}>{description}</div>

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose}>
            {cancelText}
          </button>
          <button
            className={`${styles.confirmBtn} ${
              confirmVariant === 'danger' ? styles.confirmDanger : styles.confirmPrimary
            }`}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
