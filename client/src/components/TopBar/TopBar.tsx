import React, { useState } from 'react';
import { Copy, Check, Users, Settings, LogOut, Shield } from 'lucide-react';
import { Badge } from '../UI/Badge.tsx';
import { Button } from '../UI/Button.tsx';
import type { ConnectionState } from '../../types/index.ts';
import styles from './TopBar.module.css';

interface TopBarProps {
  roomId: string;
  isHost: boolean;
  participantCount: number;
  connectionState: ConnectionState;
  hasPasscode?: boolean;
  onOpenSettings?: () => void;
  onLeaveRoom?: () => void;
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  roomId,
  isHost,
  participantCount,
  connectionState,
  hasPasscode,
  onOpenSettings,
  onLeaveRoom,
  onToggleSidebar,
  isSidebarOpen,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusText = () => {
    switch (connectionState) {
      case 'connected':
        return 'Connected';
      case 'reconnecting':
        return 'Reconnecting...';
      case 'offline':
        return 'Offline';
    }
  };

  return (
    <header className={styles.topBar}>
      <div className={styles.leftSection}>
        <div className={styles.brand}>
          <span className={styles.brandName}>Kollab</span>
        </div>

        <div className={styles.separator} />

        <div className={styles.roomInfo}>
          <span className={styles.roomLabel}>ROOM /</span>
          <button
            className={styles.roomIdBtn}
            onClick={handleCopyRoomId}
            title="Click to copy Room ID"
          >
            <span className={styles.roomIdText}>{roomId}</span>
            {copied ? (
              <Check size={13} className={styles.copiedIcon} />
            ) : (
              <Copy size={13} className={styles.copyIcon} />
            )}
          </button>
          {hasPasscode && (
            <span className={styles.lockBadge} title="Passcode protected">
              <Shield size={11} />
            </span>
          )}
        </div>
      </div>

      <div className={styles.centerSection}>
        <Badge variant="status" status={connectionState}>
          {getStatusText()}
        </Badge>
      </div>

      <div className={styles.rightSection}>
        {isHost && <Badge variant="host">HOST</Badge>}

        <button
          className={`${styles.participantToggle} ${isSidebarOpen ? styles.active : ''}`}
          onClick={onToggleSidebar}
          title="Toggle participants & activity"
        >
          <Users size={14} />
          <span>{participantCount} {participantCount === 1 ? 'participant' : 'participants'}</span>
        </button>

        {isHost && onOpenSettings && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenSettings}
            title="Room settings"
          >
            <Settings size={14} />
          </Button>
        )}

        {onLeaveRoom && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onLeaveRoom}
            title="Leave workspace"
          >
            <LogOut size={14} />
          </Button>
        )}
      </div>
    </header>
  );
};
