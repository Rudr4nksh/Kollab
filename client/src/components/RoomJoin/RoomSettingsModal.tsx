import React, { useState } from 'react';
import { Modal } from '../UI/Modal.tsx';
import { Button } from '../UI/Button.tsx';
import { Input } from '../UI/Input.tsx';
import { Copy, Check, Shield, Share2 } from 'lucide-react';
import styles from './RoomSettingsModal.module.css';

interface RoomSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  isHost: boolean;
  hasPasscode?: boolean;
}

export const RoomSettingsModal: React.FC<RoomSettingsModalProps> = ({
  isOpen,
  onClose,
  roomId,
  isHost,
  hasPasscode,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  const shareUrl = `${window.location.origin}/?room=${encodeURIComponent(roomId)}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(roomId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Workspace Settings" width="460px">
      <div className={styles.content}>
        <div className={styles.section}>
          <label className={styles.label}>Room Identification</label>
          <div className={styles.row}>
            <Input
              value={roomId}
              readOnly
              className={styles.idInput}
            />
            <Button
              variant="secondary"
              size="md"
              icon={copiedId ? <Check size={14} /> : <Copy size={14} />}
              onClick={handleCopyId}
            >
              {copiedId ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </div>

        <div className={styles.section}>
          <label className={styles.label}>Direct Share Link</label>
          <div className={styles.row}>
            <Input
              value={shareUrl}
              readOnly
              className={styles.urlInput}
            />
            <Button
              variant="primary"
              size="md"
              icon={copiedLink ? <Check size={14} /> : <Share2 size={14} />}
              onClick={handleCopyLink}
            >
              {copiedLink ? 'Copied Link' : 'Share'}
            </Button>
          </div>
        </div>

        <div className={styles.infoBox}>
          <div className={styles.infoIcon}>
            <Shield size={16} />
          </div>
          <div className={styles.infoText}>
            <p className={styles.infoTitle}>
              {hasPasscode ? 'Passcode Protected Room' : 'Open Workspace'}
            </p>
            <p className={styles.infoDesc}>
              {hasPasscode
                ? 'Participants must enter the workspace passcode to join.'
                : 'Anyone with the Room ID or share link can join and edit in real time.'}
            </p>
          </div>
        </div>

        {isHost && (
          <div className={styles.hostNotice}>
            <span>You are the active <strong>HOST</strong> of this room. Administrative privileges are enforced server-side.</span>
          </div>
        )}
      </div>
    </Modal>
  );
};
