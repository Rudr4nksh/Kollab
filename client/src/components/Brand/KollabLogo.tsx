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

          {/* Subtle background code syntax lines */}
          <rect x="9" y="14" width="13" height="2.2" rx="1.1" fill="#3B82F6" opacity="0.24" />
          <rect x="9" y="20" width="17" height="2.2" rx="1.1" fill="#3B82F6" opacity="0.3" />
          <rect x="9" y="26" width="9"  height="2.2" rx="1.1" fill="#3B82F6" opacity="0.2" />
          <rect x="9" y="32" width="15" height="2.2" rx="1.1" fill="#3B82F6" opacity="0.26" />
          <rect x="9" y="38" width="10" height="2.2" rx="1.1" fill="#3B82F6" opacity="0.2" />
          <rect x="9" y="44" width="16" height="2.2" rx="1.1" fill="#3B82F6" opacity="0.3" />
          <rect x="9" y="50" width="13" height="2.2" rx="1.1" fill="#3B82F6" opacity="0.22" />

          {/* Stylized 'K' */}
          {/* 1. Top electric blue cursor block */}
          <rect x="21" y="13" width="9.5" height="7.5" rx="1.8" fill="#2563EB" filter="url(#kollabGlow)" />

          {/* 2. White vertical stem */}
          <rect x="21" y="22.5" width="8" height="29.5" rx="1.5" fill="#FFFFFF" />

          {/* 3. Upper diagonal arm (Electric blue) */}
          <line
            x1="28"
            y1="34"
            x2="43.5"
            y2="18.5"
            stroke="#2563EB"
            strokeWidth="6.8"
            strokeLinecap="round"
          />

          {/* 4. Lower diagonal leg (Sky blue) */}
          <line
            x1="28"
            y1="36"
            x2="42.5"
            y2="50"
            stroke="#60A5FA"
            strokeWidth="6.8"
            strokeLinecap="round"
          />

          {/* 5. Lower horizontal foot bracket (Sky blue) */}
          <rect x="36" y="48.5" width="13.5" height="4.5" rx="1.6" fill="#60A5FA" />
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
