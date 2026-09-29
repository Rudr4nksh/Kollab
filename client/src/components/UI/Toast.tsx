import React from 'react';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';
import styles from './Toast.module.css';

export interface ToastMessage {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className={styles.container}>
      {toasts.map((toast) => (
        <div key={toast.id} className={`${styles.toast} ${styles[toast.type]}`}>
          <div className={styles.icon}>
            {toast.type === 'success' && <CheckCircle size={14} />}
            {toast.type === 'error' && <AlertCircle size={14} />}
            {toast.type === 'warning' && <AlertCircle size={14} />}
            {toast.type === 'info' && <Info size={14} />}
          </div>
          <span className={styles.message}>{toast.message}</span>
          <button className={styles.closeBtn} onClick={() => onDismiss(toast.id)}>
            <X size={12} />
          </button>
        </div>
      ))}
    </div>
  );
};
