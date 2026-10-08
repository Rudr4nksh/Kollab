import React, { useState } from 'react';
import { 
  MoreVertical, 
  UserX, 
  Check, 
  Crown, 
  ShieldCheck, 
  Shield, 
  Code2, 
  Eye 
} from 'lucide-react';
import { Avatar } from '../UI/Avatar.tsx';
import { ConfirmModal } from '../UI/ConfirmModal.tsx';
import type { Participant, UserRole } from '../../types/index.ts';
import {
  canChangeTargetRole,
  canKickUser,
  getAssignableRoles,
} from '../../services/permissions.ts';
import styles from './ParticipantList.module.css';

interface ParticipantListProps {
  participants: Participant[];
  currentUserId: string;
  onUpdateRole?: (targetUserId: string, newRole: UserRole) => void;
  onKickUser?: (targetUserId: string) => void;
}

interface ConfirmState {
  isOpen: boolean;
  type: 'transfer' | 'kick';
  targetUser?: Participant;
  newRole?: UserRole;
}

export const ParticipantList: React.FC<ParticipantListProps> = ({
  participants,
  currentUserId,
  onUpdateRole,
  onKickUser,
}) => {
  const [openMenuUserId, setOpenMenuUserId] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<ConfirmState>({
    isOpen: false,
    type: 'kick',
  });

  const currentUser = participants.find((p) => p.id === currentUserId);
  const currentUserRole: UserRole = currentUser?.role || 'editor';

  const getRoleStyle = (role: UserRole) => {
    switch (role) {
      case 'host':
        return styles.roleHost;
      case 'co-host':
        return styles.roleCoHost;
      case 'admin':
        return styles.roleAdmin;
      case 'viewer':
        return styles.roleViewer;
      case 'editor':
      case 'participant':
      default:
        return styles.roleEditor;
    }
  };

  const renderRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'host':
        return <Crown size={11} className={styles.roleIcon} />;
      case 'co-host':
        return <ShieldCheck size={11} className={styles.roleIcon} />;
      case 'admin':
        return <Shield size={11} className={styles.roleIcon} />;
      case 'viewer':
        return <Eye size={11} className={styles.roleIcon} />;
      case 'editor':
      case 'participant':
      default:
        return <Code2 size={11} className={styles.roleIcon} />;
    }
  };

  const getRoleDisplayName = (role: UserRole) => {
    switch (role) {
      case 'host':
        return 'Host';
      case 'co-host':
        return 'Co-Host';
      case 'admin':
        return 'Admin';
      case 'viewer':
        return 'Viewer';
      case 'editor':
      case 'participant':
      default:
        return 'Editor';
    }
  };

  const handleRoleSelect = (targetUser: Participant, newRole: UserRole) => {
    setOpenMenuUserId(null);
    if (!onUpdateRole) return;

    if (newRole === 'host') {
      // Open in-app website modal for transfer confirmation
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
    setOpenMenuUserId(null);
    if (!onKickUser) return;

    // Open in-app website modal for kick confirmation
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

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <span className={styles.title}>Participants</span>
          <span className={styles.count}>{participants.length}</span>
        </div>
      </div>

      <div className={styles.list}>
        {participants.length === 0 ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyTitle}>No participants</p>
            <p className={styles.emptySubtitle}>Share the workspace ID to invite others.</p>
          </div>
        ) : (
          participants.map((user) => {
            const isMe = user.id === currentUserId;
            const isTyping = user.status === 'typing';
            const userRole = user.role || 'editor';

            const assignable = getAssignableRoles(currentUserRole).filter((r) =>
              canChangeTargetRole(currentUserRole, userRole, r.role)
            );
            const kickAllowed = canKickUser(currentUserRole, userRole);
            const showActionMenu = !isMe && (assignable.length > 0 || kickAllowed);
            const isMenuOpen = openMenuUserId === user.id;

            return (
              <div
                key={user.id}
                className={`${styles.item} ${isMe ? styles.isMe : ''}`}
              >
                <Avatar
                  name={user.name}
                  color={user.color}
                  size="md"
                  isTyping={isTyping}
                />

                <div className={styles.info}>
                  <div className={styles.nameRow}>
                    <div className={styles.nameWrap}>
                      <span
                        className={styles.name}
                        style={{ color: isMe ? 'var(--text-primary)' : user.color }}
                      >
                        {user.name}
                      </span>
                      {isMe && <span className={styles.youTag}>you</span>}
                    </div>

                    <span
                      className={`${styles.roleBadge} ${getRoleStyle(userRole)}`}
                      title={`${getRoleDisplayName(userRole)} role`}
                    >
                      {renderRoleIcon(userRole)}
                      {getRoleDisplayName(userRole)}
                    </span>
                  </div>

                  <div className={styles.statusRow}>
                    {isTyping ? (
                      <span className={styles.statusTyping}>
                        <span className={styles.typingDot} />
                        typing...
                      </span>
                    ) : user.currentLine ? (
                      <span className={styles.statusEditing}>
                        line {user.currentLine}
                      </span>
                    ) : (
                      <span className={styles.statusActive}>
                        ● {user.status}
                      </span>
                    )}
                  </div>
                </div>

                {/* Authority action menu */}
                {showActionMenu && (
                  <div className={styles.actionsWrap}>
                    <button
                      className={`${styles.actionBtn} ${isMenuOpen ? styles.actionBtnActive : ''}`}
                      onClick={() => setOpenMenuUserId(isMenuOpen ? null : user.id)}
                      title="Manage participant"
                    >
                      <MoreVertical size={13} />
                    </button>

                    {isMenuOpen && (
                      <>
                        <div
                          className={styles.dropdownBackdrop}
                          onClick={() => setOpenMenuUserId(null)}
                        />
                        <div className={styles.dropdown}>
                          {assignable.length > 0 && (
                            <>
                              <div className={styles.dropdownHeader}>Set Role</div>
                              {assignable.map((opt) => {
                                const isActive = userRole === opt.role;
                                return (
                                  <button
                                    key={opt.role}
                                    className={`${styles.dropdownItem} ${
                                      isActive ? styles.dropdownItemActive : ''
                                    }`}
                                    onClick={() => handleRoleSelect(user, opt.role)}
                                  >
                                    <span className={styles.itemLabel}>
                                      {renderRoleIcon(opt.role)}
                                      {opt.label}
                                    </span>
                                    {isActive && <Check size={11} />}
                                  </button>
                                );
                              })}
                            </>
                          )}

                          {kickAllowed && (
                            <>
                              {assignable.length > 0 && <div className={styles.divider} />}
                              <button
                                className={`${styles.dropdownItem} ${styles.dropdownItemDanger}`}
                                onClick={() => handleKickClick(user)}
                              >
                                <span className={styles.itemLabel}>
                                  <UserX size={12} />
                                  Remove from room
                                </span>
                              </button>
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })
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
            ? `Are you sure you want to transfer Host ownership to ${confirmModal.targetUser?.name}? You will step down to Co-Host.`
            : `Are you sure you want to remove ${confirmModal.targetUser?.name} from this workspace? They will be disconnected immediately.`
        }
        confirmText={
          confirmModal.type === 'transfer' ? 'Transfer Host' : 'Remove'
        }
        confirmVariant={
          confirmModal.type === 'transfer' ? 'warning' : 'danger'
        }
        icon={confirmModal.type === 'transfer' ? 'transfer' : 'kick'}
      />
    </div>
  );
};
