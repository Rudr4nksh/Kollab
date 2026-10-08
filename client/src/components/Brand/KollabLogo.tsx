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
      {/* Stylized Kollab Icon Mark with transparent background */}
      <div className={styles.logoMark} style={{ width: pixelSize, height: pixelSize }}>
        <svg
          width={pixelSize}
          height={pixelSize}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Pure Geometric 'K' Mark - Clean stem and diagonal arms on transparent background */}
          {/* Vertical stem (adapts dynamically to active room theme) */}
          <rect x="18.5" y="14" width="7" height="36" rx="2" fill="var(--text-primary, #FFFFFF)" />

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
