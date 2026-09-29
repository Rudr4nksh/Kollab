import React from 'react';
import styles from './Badge.module.css';

interface BadgeProps {
  children?: React.ReactNode;
  variant?: 'host' | 'status' | 'neutral' | 'accent' | 'count';
  status?: 'connected' | 'reconnecting' | 'offline';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  status,
  size = 'md',
}) => {
  return (
    <span className={`${styles.badge} ${styles[variant]} ${styles[size]}`}>
      {status && <span className={`${styles.dot} ${styles[status]}`} />}
      {children}
    </span>
  );
};
