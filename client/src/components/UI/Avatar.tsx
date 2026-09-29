import React from 'react';
import { getInitials } from '../../services/colors.ts';
import styles from './Avatar.module.css';

interface AvatarProps {
  name: string;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
  isTyping?: boolean;
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  color = '#7357E8',
  size = 'md',
  isTyping = false,
}) => {
  const initials = getInitials(name);

  return (
    <div
      className={`${styles.avatar} ${styles[size]} ${isTyping ? styles.typing : ''}`}
      style={{
        backgroundColor: `${color}20`,
        borderColor: `${color}60`,
        color: color,
      }}
    >
      <span className={styles.initials}>{initials}</span>
    </div>
  );
};
