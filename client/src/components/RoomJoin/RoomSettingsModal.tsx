import React, { useState, useEffect } from 'react';
import { Modal } from '../UI/Modal.tsx';
import { Button } from '../UI/Button.tsx';
import { Input } from '../UI/Input.tsx';
import { Copy, Check, Shield, Share2, FolderGit2, Trash2 } from 'lucide-react';
import { gitService, GitHubUser } from '../../services/gitService.ts';
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

  // GitHub integration state
  const [ghTokenInput, setGhTokenInput] = useState('');
  const [remoteUrlInput, setRemoteUrlInput] = useState('');
  const [ghUser, setGhUser] = useState<GitHubUser | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);

  // Load existing token & remote on modal open
  useEffect(() => {
    if (isOpen) {
      const token = gitService.getGitHubToken();
      if (token) setGhTokenInput(token);
      setGhUser(gitService.getGitHubUser());
      const remote = gitService.getRemote('origin');
      if (remote) setRemoteUrlInput(remote);
      setAuthError(null);
      setAuthSuccess(null);
    }
  }, [isOpen]);

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

  const handleVerifyGitHub = async () => {
    if (!ghTokenInput.trim()) {
      setAuthError('Please enter a GitHub Personal Access Token.');
      return;
    }

    setIsVerifying(true);
    setAuthError(null);
    setAuthSuccess(null);

    const res = await gitService.setGitHubToken(ghTokenInput.trim());
    setIsVerifying(false);

    if (res.success && res.user) {
      setGhUser(res.user);
      setAuthSuccess(`Connected as @${res.user.login}! Ready to commit and push.`);
    } else {
      setAuthError(res.error || 'Failed to authenticate token with GitHub.');
    }
  };

  const handleLoginWithGitHub = async () => {
    setIsVerifying(true);
    setAuthError(null);
    setAuthSuccess(null);
    const res = await gitService.loginWithGitHub();
    setIsVerifying(false);
    if (res.success && res.user) {
      setGhUser(res.user);
      setAuthSuccess(`Signed in as @${res.user.login}! Ready to push and commit.`);
    } else {
      setAuthError(res.error || 'Failed to sign in with GitHub.');
    }
  };

  const handleDisconnectGitHub = () => {
    gitService.clearGitHubAuth();
    setGhTokenInput('');
    setGhUser(null);
    setAuthSuccess(null);
    setAuthError(null);
  };

  const handleSaveRemote = () => {
    if (!remoteUrlInput.trim()) {
      gitService.removeRemote('origin');
      setAuthSuccess('Remote origin cleared.');
      return;
    }
    gitService.setRemote('origin', remoteUrlInput.trim());
    setAuthSuccess(`Remote 'origin' set to ${remoteUrlInput.trim()}`);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Workspace Settings" width="480px">
      <div className={styles.content}>
        {/* Room Identification */}
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

        {/* Direct Share Link */}
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

        {/* GitHub Integration Section */}
        <div className={styles.githubCard}>
          <div className={styles.githubHeader}>
            <div className={styles.githubTitleGroup}>
              <FolderGit2 size={15} />
              <span>GitHub Integration</span>
            </div>
            <span
              className={`${styles.githubBadge} ${
                ghUser ? styles.badgeConnected : styles.badgeDisconnected
              }`}
            >
              {ghUser ? '● Connected' : '○ Not Connected'}
            </span>
          </div>

          {ghUser ? (
            <div className={styles.githubUserBox}>
              <div className={styles.githubUserInfo}>
                {ghUser.avatar_url && (
                  <img
                    src={ghUser.avatar_url}
                    alt={ghUser.login}
                    className={styles.githubAvatar}
                  />
                )}
                <div className={styles.githubDetails}>
                  <span className={styles.githubLogin}>@{ghUser.login}</span>
                  <span className={styles.githubSub}>{ghUser.name || 'Verified GitHub User'}</span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                icon={<Trash2 size={13} />}
                onClick={handleDisconnectGitHub}
                title="Disconnect GitHub account"
              >
                Disconnect
              </Button>
            </div>
          ) : (
            <div className={styles.section}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <Button
                  variant="primary"
                  size="md"
                  icon={<FolderGit2 size={15} />}
                  onClick={handleLoginWithGitHub}
                  disabled={isVerifying}
                  style={{ width: '100%', justifyContent: 'center', padding: '10px 14px' }}
                >
                  {isVerifying ? 'Signing in with GitHub...' : 'Sign in with GitHub'}
                </Button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '4px 0' }}>
                  <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
                  <span style={{ fontSize: '11px', color: '#717888' }}>or use personal token</span>
                  <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
                </div>

                <div className={styles.row}>
                  <Input
                    type="password"
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    value={ghTokenInput}
                    onChange={(e) => setGhTokenInput(e.target.value)}
                    className={styles.urlInput}
                  />
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={handleVerifyGitHub}
                    disabled={isVerifying}
                  >
                    Connect
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Remote Repository URL */}
          <div className={styles.section}>
            <label className={styles.label}>Default Remote Origin (GitHub)</label>
            <div className={styles.row}>
              <Input
                type="text"
                placeholder="https://github.com/owner/repository.git"
                value={remoteUrlInput}
                onChange={(e) => setRemoteUrlInput(e.target.value)}
                className={styles.urlInput}
              />
              <Button
                variant="secondary"
                size="md"
                onClick={handleSaveRemote}
              >
                Set Remote
              </Button>
            </div>
          </div>

          {authError && <div className={styles.errorMsg}>{authError}</div>}
          {authSuccess && <div className={styles.successMsg}>{authSuccess}</div>}
        </div>

        {/* Room Info Box */}
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
