import React from 'react';
import styles from './KollabLogo.module.css';

interface KollabLogoProps {
  size?: 'sm' | 'md' | 'lg' | number;
  showText?: boolean;
  showTagline?: boolean;
  showAccentLine?: boolean;
  version?: string;
  className?: string;
  onClick?: () => void;
}

export const KollabLogo: React.FC<KollabLogoProps> = ({
  size = 'md',
  showText = true,
  showTagline = false,
  showAccentLine = false,
  version,
  className = '',
  onClick,
}) => {
  const pixelSize =
    typeof size === 'number'
      ? size
      : size === 'sm'
      ? 24
      : size === 'lg'
      ? 48
      : 34;

  const titleClass =
    typeof size === 'number'
      ? size >= 40
        ? styles.titleLg
        : size >= 30
        ? styles.titleMd
        : styles.titleSm
      : size === 'lg'
      ? styles.titleLg
      : size === 'md'
      ? styles.titleMd
      : styles.titleSm;

  return (
    <div
      className={`${styles.container} ${onClick ? styles.clickable : ''} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {/* Stylized Kollab Icon Mark (inspired by user branding) */}
      <div className={styles.logoMark} style={{ width: pixelSize, height: pixelSize }}>
        <svg
          width={pixelSize}
          height={pixelSize}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="kollabLogoBg" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#161B28" />
              <stop offset="100%" stopColor="#0B0E17" />
            </linearGradient>
            <filter id="kollabGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#2563EB" floodOpacity="0.3" />
            </filter>
          </defs>

          {/* Dark squircle container with subtle border */}
          <rect
            x="2"
            y="2"
            width="60"
            height="60"
            rx="15"
            fill="url(#kollabLogoBg)"
            stroke="rgba(255, 255, 255, 0.09)"
            strokeWidth="1.2"
          />

          {/* Pure Geometric 'K' Mark - Clean stem and diagonal arms */}
          {/* Vertical white stem */}
          <rect x="18.5" y="14" width="7" height="36" rx="2" fill="#FFFFFF" />

          {/* Upper diagonal arm (Electric blue) */}
          <line
            x1="25.5"
            y1="31"
            x2="42.5"
            y2="15.5"
            stroke="#3B82F6"
            strokeWidth="7"
            strokeLinecap="round"
          />

          {/* Lower diagonal leg (Sky blue) */}
          <line
            x1="25.5"
            y1="33"
            x2="42.5"
            y2="48.5"
            stroke="#60A5FA"
            strokeWidth="7"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Typography: Wordmark & Tagline */}
      {showText && (
        <div className={styles.textGroup}>
          <div className={styles.titleRow}>
            <span className={`${styles.brandTitle} ${titleClass}`}>Kollab</span>
            {version && <span className={styles.versionBadge}>{version}</span>}
          </div>
          {showAccentLine && <div className={styles.accentLine} />}
          {showTagline && <span className={styles.tagline}>Collaborative code editor</span>}
        </div>
      )}
    </div>
  );
};
