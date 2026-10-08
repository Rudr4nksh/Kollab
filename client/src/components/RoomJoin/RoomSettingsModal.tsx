import React, { useState, useEffect } from 'react';
import { Modal } from '../UI/Modal.tsx';
import { Button } from '../UI/Button.tsx';
import { Input } from '../UI/Input.tsx';
import { 
  Copy, 
  Check, 
  Shield, 
  Share2, 
  FolderGit2, 
  Crown, 
  ShieldCheck, 
  Code2, 
  Eye, 
  UserX
} from 'lucide-react';
import { Avatar } from '../UI/Avatar.tsx';
import { ConfirmModal } from '../UI/ConfirmModal.tsx';
import { gitService, GitHubUser } from '../../services/gitService.ts';
import { copyToClipboard } from '../../services/clipboardUtils.ts';
import { 
  ROLE_CAPABILITIES, 
  canChangeTargetRole, 
  canKickUser, 
  getAssignableRoles,
  canManageRoles
} from '../../services/permissions.ts';
import type { Participant, UserRole } from '../../types/index.ts';
import styles from './RoomSettingsModal.module.css';

interface RoomSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  isHost: boolean;
  hasPasscode?: boolean;
  currentUserRole?: UserRole;
  currentUserId?: string;
  participants?: Participant[];
  onUpdateRole?: (targetUserId: string, newRole: UserRole) => void;
  onKickUser?: (targetUserId: string) => void;
}

interface ConfirmState {
  isOpen: boolean;
  type: 'transfer' | 'kick';
  targetUser?: Participant;
  newRole?: UserRole;
}

export const RoomSettingsModal: React.FC<RoomSettingsModalProps> = ({
  isOpen,
  onClose,
  roomId,
  isHost,
  hasPasscode,
  currentUserRole = 'editor',
  currentUserId = '',
  participants = [],
  onUpdateRole,
  onKickUser,
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'permissions' | 'git'>('general');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // GitHub integration state
  const [ghTokenInput, setGhTokenInput] = useState('');
  const [remoteUrlInput, setRemoteUrlInput] = useState('');
  const [ghUser, setGhUser] = useState<GitHubUser | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);

  // In-app confirmation dialog state
  const [confirmModal, setConfirmModal] = useState<ConfirmState>({
    isOpen: false,
    type: 'kick',
  });

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

  const handleCopyLink = async () => {
    const success = await copyToClipboard(shareUrl);
    if (success) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleCopyId = async () => {
    const success = await copyToClipboard(roomId);
    if (success) {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
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
      setAuthSuccess(`Connected as @${res.user.login}. Ready to commit and push.`);
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
      setAuthSuccess(`Signed in as @${res.user.login}. Ready to push and commit.`);
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
    setAuthSuccess(`Remote origin set to ${remoteUrlInput.trim()}`);
  };

  const handleRoleChangeSelect = (targetUser: Participant, newRole: UserRole) => {
    if (!onUpdateRole) return;
    if (newRole === 'host') {
      setConfirmModal({
        isOpen: true,
        type: 'transfer',
        targetUser,
        newRole: 'host',
      });
      return;
    }
    onUpdateRole(targetUser.id, newRole);
  };

  const handleKickClick = (targetUser: Participant) => {
    if (!onKickUser) return;
    setConfirmModal({
      isOpen: true,
      type: 'kick',
      targetUser,
    });
  };

  const handleConfirmAction = () => {
    if (confirmModal.type === 'transfer' && confirmModal.targetUser && confirmModal.newRole) {
      onUpdateRole?.(confirmModal.targetUser.id, confirmModal.newRole);
    } else if (confirmModal.type === 'kick' && confirmModal.targetUser) {
      onKickUser?.(confirmModal.targetUser.id);
    }
  };

  const renderRoleCard = () => {
    let icon = <Code2 size={16} />;
    let cardClass = styles.roleCardEditor;
    let title = 'Workspace Editor';
    let pillText = 'Editor';
    let pillStyle = { color: '#4ade80', backgroundColor: 'rgba(34, 197, 94, 0.12)' };
    let desc = 'You have collaborative code editing, file authoring, and execution access.';

    if (currentUserRole === 'host' || isHost) {
      icon = <Crown size={16} />;
      cardClass = styles.roleCardHost;
      title = 'Workspace Host';
      pillText = 'Host';
      pillStyle = { color: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.15)' };
      desc = 'You have full administrative authority over workspace settings, role assignments, and ownership succession.';
    } else if (currentUserRole === 'co-host') {
      icon = <ShieldCheck size={16} />;
      cardClass = styles.roleCardCoHost;
      title = 'Workspace Co-Host';
      pillText = 'Co-Host';
      pillStyle = { color: '#38bdf8', backgroundColor: 'rgba(56, 189, 248, 0.15)' };
      desc = 'You have workspace settings access, role management privileges, and participant moderation authority.';
    } else if (currentUserRole === 'admin') {
      icon = <Shield size={16} />;
      cardClass = styles.roleCardAdmin;
      title = 'Workspace Admin';
      pillText = 'Admin';
      pillStyle = { color: '#c084fc', backgroundColor: 'rgba(168, 85, 247, 0.15)' };
      desc = 'You have file management operations and standard participant moderation privileges.';
    } else if (currentUserRole === 'viewer') {
      icon = <Eye size={16} />;
      cardClass = styles.roleCardViewer;
      title = 'Workspace Viewer';
      pillText = 'Viewer';
      pillStyle = { color: '#94a3b8', backgroundColor: 'rgba(148, 163, 184, 0.15)' };
      desc = 'You have read-only observation access. Code editing and command execution are restricted.';
    }

    return (
      <div className={`${styles.roleCard} ${cardClass}`}>
        <div className={styles.roleIconWrap} style={{ color: pillStyle.color }}>
          {icon}
        </div>
        <div className={styles.roleContent}>
          <div className={styles.roleHeader}>
            <span className={styles.roleTitle}>{title}</span>
            <span className={styles.rolePill} style={pillStyle}>
              {pillText}
            </span>
          </div>
          <span className={styles.roleDesc}>{desc}</span>
        </div>
      </div>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Workspace Settings" width="520px">
      <div className={styles.content}>
        {/* Tab Navigation */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tabBtn} ${activeTab === 'general' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('general')}
          >
            <Share2 size={13} />
            General
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'permissions' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('permissions')}
          >
            <Shield size={13} />
            Roles & Authority
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'git' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('git')}
          >
            <FolderGit2 size={13} />
            GitHub
          </button>
        </div>

        {/* Tab 1: General */}
        {activeTab === 'general' && (
          <div className={styles.tabContent}>
            {/* Dynamic Role Status Card (replaces old static hostNotice) */}
            {renderRoleCard()}

            {/* Room Identification */}
            <div className={styles.section}>
              <label className={styles.label}>Workspace ID</label>
              <div className={styles.row}>
                <Input value={roomId} readOnly className={styles.idInput} />
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
              <label className={styles.label}>Direct Invite Link</label>
              <div className={styles.row}>
                <Input value={shareUrl} readOnly className={styles.urlInput} />
                <Button
                  variant="secondary"
                  size="md"
                  icon={copiedLink ? <Check size={14} /> : <Copy size={14} />}
                  onClick={handleCopyLink}
                >
                  {copiedLink ? 'Copied' : 'Copy'}
                </Button>
              </div>
            </div>

            {/* Room Info Box */}
            <div className={styles.infoBox}>
              <div className={styles.infoIcon}>
                <Shield size={15} />
              </div>
              <div className={styles.infoText}>
                <p className={styles.infoTitle}>
                  {hasPasscode ? 'Passcode Protected Workspace' : 'Open Workspace'}
                </p>
                <p className={styles.infoDesc}>
                  {hasPasscode
                    ? 'Participants must supply the passcode before entering.'
                    : 'Anyone with the workspace ID or invite link can join and collaborate in real time.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Permissions & Roles */}
        {activeTab === 'permissions' && (
          <div className={styles.tabContent}>
            {/* Your active role card */}
            {renderRoleCard()}

            {/* Role Hierarchy Matrix */}
            <div className={styles.section}>
              <label className={styles.label}>Role Authority Levels</label>
              <div className={styles.matrixGrid}>
                {/* Host */}
                <div className={styles.matrixCard}>
                  <div className={styles.matrixCardHeader}>
                    <div className={styles.matrixTitleGroup}>
                      <Crown size={13} style={{ color: '#f59e0b' }} />
                      <span>Host</span>
                    </div>
                    <span className={styles.rolePill} style={{ color: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.12)' }}>
                      Full Control
                    </span>
                  </div>
                  <span className={styles.matrixDesc}>
                    {ROLE_CAPABILITIES.host.description}
                  </span>
                  <div className={styles.capsList}>
                    <span className={`${styles.capBadge} ${styles.capBadgeGranted}`}>Host Transfer</span>
                    <span className={`${styles.capBadge} ${styles.capBadgeGranted}`}>Manage Roles</span>
                    <span className={`${styles.capBadge} ${styles.capBadgeGranted}`}>Kick Members</span>
                    <span className={`${styles.capBadge} ${styles.capBadgeGranted}`}>Edit Code</span>
                    <span className={`${styles.capBadge} ${styles.capBadgeGranted}`}>Run Code</span>
                  </div>
                </div>

                {/* Co-Host */}
                <div className={styles.matrixCard}>
                  <div className={styles.matrixCardHeader}>
                    <div className={styles.matrixTitleGroup}>
                      <ShieldCheck size={13} style={{ color: '#38bdf8' }} />
                      <span>Co-Host</span>
                    </div>
                    <span className={styles.rolePill} style={{ color: '#38bdf8', backgroundColor: 'rgba(56, 189, 248, 0.12)' }}>
                      Moderation Lead
                    </span>
                  </div>
                  <span className={styles.matrixDesc}>
                    {ROLE_CAPABILITIES['co-host'].description}
                  </span>
                  <div className={styles.capsList}>
                    <span className={`${styles.capBadge} ${styles.capBadgeGranted}`}>Manage Roles</span>
                    <span className={`${styles.capBadge} ${styles.capBadgeGranted}`}>Kick Non-Hosts</span>
                    <span className={`${styles.capBadge} ${styles.capBadgeGranted}`}>Room Settings</span>
                    <span className={`${styles.capBadge} ${styles.capBadgeGranted}`}>Edit Code</span>
                    <span className={`${styles.capBadge} ${styles.capBadgeGranted}`}>Run Code</span>
                  </div>
                </div>

                {/* Admin */}
                <div className={styles.matrixCard}>
                  <div className={styles.matrixCardHeader}>
                    <div className={styles.matrixTitleGroup}>
                      <Shield size={13} style={{ color: '#c084fc' }} />
                      <span>Admin</span>
                    </div>
                    <span className={styles.rolePill} style={{ color: '#c084fc', backgroundColor: 'rgba(168, 85, 247, 0.12)' }}>
                      Moderator
                    </span>
                  </div>
                  <span className={styles.matrixDesc}>
                    {ROLE_CAPABILITIES.admin.description}
                  </span>
                  <div className={styles.capsList}>
                    <span className={`${styles.capBadge} ${styles.capBadgeGranted}`}>Kick Editors & Viewers</span>
                    <span className={`${styles.capBadge} ${styles.capBadgeGranted}`}>Manage Files</span>
                    <span className={`${styles.capBadge} ${styles.capBadgeGranted}`}>Run Code</span>
                    <span className={`${styles.capBadge} ${styles.capBadgeDenied}`}>Assign Roles</span>
                  </div>
                </div>

                {/* Editor & Viewer Summary */}
                <div className={styles.matrixCard}>
                  <div className={styles.matrixCardHeader}>
                    <div className={styles.matrixTitleGroup}>
                      <Code2 size={13} style={{ color: '#4ade80' }} />
                      <span>Editor & Viewer</span>
                    </div>
                    <span className={styles.rolePill} style={{ color: '#94a3b8', backgroundColor: 'rgba(148, 163, 184, 0.12)' }}>
                      Collaborator / Observer
                    </span>
                  </div>
                  <span className={styles.matrixDesc}>
                    Editors have standard write access. Viewers are restricted to read-only access.
                  </span>
                  <div className={styles.capsList}>
                    <span className={`${styles.capBadge} ${styles.capBadgeGranted}`}>Editor: Write & Run</span>
                    <span className={`${styles.capBadge} ${styles.capBadgeDenied}`}>Viewer: Read-Only</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Manage Participants if Host or Co-Host */}
            {canManageRoles(currentUserRole) && participants.length > 0 && (
              <div className={styles.section}>
                <label className={styles.label}>Manage Room Participants ({participants.length})</label>
                <div className={styles.participantManageList}>
                  {participants.map((p) => {
                    const isSelf = p.id === currentUserId;
                    const pRole = p.role || 'editor';
                    const assignable = getAssignableRoles(currentUserRole).filter((r) =>
                      canChangeTargetRole(currentUserRole, pRole, r.role)
                    );
                    const kickAllowed = canKickUser(currentUserRole, pRole);

                    return (
                      <div key={p.id} className={styles.participantRow}>
                        <div className={styles.participantLeft}>
                          <Avatar name={p.name} color={p.color} size="sm" />
                          <span className={styles.participantName}>
                            {p.name}
                            {isSelf && ' (you)'}
                          </span>
                        </div>

                        <div className={styles.participantActions}>
                          {!isSelf && assignable.length > 0 ? (
                            <select
                              className={styles.roleSelect}
                              value={pRole}
                              onChange={(e) => handleRoleChangeSelect(p, e.target.value as UserRole)}
                            >
                              <option value={pRole} disabled>
                                Current: {pRole.toUpperCase()}
                              </option>
                              {assignable.map((r) => (
                                <option key={r.role} value={r.role}>
                                  {r.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span
                              className={styles.rolePill}
                              style={{
                                color: pRole === 'host' ? '#f59e0b' : pRole === 'co-host' ? '#38bdf8' : '#94a3b8',
                                backgroundColor: 'rgba(255,255,255,0.05)',
                              }}
                            >
                              {pRole.toUpperCase()}
                            </span>
                          )}

                          {!isSelf && kickAllowed && (
                            <button
                              className={styles.kickBtnSmall}
                              onClick={() => handleKickClick(p)}
                              title={`Remove ${p.name}`}
                            >
                              <UserX size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: GitHub */}
        {activeTab === 'git' && (
          <div className={styles.tabContent}>
            {/* GitHub Account Card */}
            <div className={styles.githubCard}>
              <div className={styles.githubHeader}>
                <div className={styles.githubTitleGroup}>
                  <FolderGit2 size={16} style={{ color: '#A78BFA' }} />
                  <span>GitHub Integration</span>
                </div>
                <span
                  className={`${styles.githubBadge} ${
                    ghUser ? styles.badgeConnected : styles.badgeDisconnected
                  }`}
                >
                  {ghUser ? 'Connected' : 'Not Connected'}
                </span>
              </div>

              {ghUser ? (
                <div className={styles.githubUserBox}>
                  <div className={styles.githubUserInfo}>
                    {ghUser.avatar_url && (
                      <img
                        src={ghUser.avatar_url}
                        alt={ghUser.name || ghUser.login}
                        className={styles.githubAvatar}
                      />
                    )}
                    <div className={styles.githubUserDetails}>
                      <span className={styles.githubUserName}>{ghUser.name || ghUser.login}</span>
                      <span className={styles.githubUserLogin}>@{ghUser.login}</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDisconnectGitHub}
                    style={{ color: '#F87171' }}
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
                      icon={<FolderGit2 size={14} />}
                      onClick={handleLoginWithGitHub}
                      disabled={isVerifying}
                      style={{ width: '100%', justifyContent: 'center' }}
                    >
                      {isVerifying ? 'Signing in...' : 'Sign in with GitHub'}
                    </Button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '4px 0' }}>
                      <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
                      <span style={{ fontSize: '11px', color: '#717888' }}>or personal access token</span>
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
                <label className={styles.label}>Default Remote Origin</label>
                <div className={styles.row}>
                  <Input
                    type="text"
                    placeholder="https://github.com/owner/repository.git"
                    value={remoteUrlInput}
                    onChange={(e) => setRemoteUrlInput(e.target.value)}
                    className={styles.urlInput}
                  />
                  <Button variant="secondary" size="md" onClick={handleSaveRemote}>
                    Set Remote
                  </Button>
                </div>
              </div>

              {authError && <div className={styles.errorMsg}>{authError}</div>}
              {authSuccess && <div className={styles.successMsg}>{authSuccess}</div>}
            </div>
          </div>
        )}
      </div>

      {/* In-app website confirmation modal (no browser popup) */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={handleConfirmAction}
        title={
          confirmModal.type === 'transfer'
            ? 'Transfer Workspace Host'
            : 'Remove Participant'
        }
        description={
          confirmModal.type === 'transfer'
            ? `Transfer Host ownership to ${confirmModal.targetUser?.name}? You will step down to Co-Host.`
            : `Remove ${confirmModal.targetUser?.name} from this workspace? They will be disconnected immediately.`
        }
        confirmText={
          confirmModal.type === 'transfer' ? 'Transfer Host' : 'Remove'
        }
        confirmVariant={
          confirmModal.type === 'transfer' ? 'warning' : 'danger'
        }
        icon={confirmModal.type === 'transfer' ? 'transfer' : 'kick'}
      />
    </Modal>
  );
};
