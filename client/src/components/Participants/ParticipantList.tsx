import React, { useState } from 'react';
import { MoreVertical, UserX, Check } from 'lucide-react';
import { Avatar } from '../UI/Avatar.tsx';
import type { Participant, UserRole } from '../../types/index.ts';
import {
  getRoleBadgeInfo,
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

export const ParticipantList: React.FC<ParticipantListProps> = ({
  participants,
  currentUserId,
  onUpdateRole,
  onKickUser,
}) => {
  const [openMenuUserId, setOpenMenuUserId] = useState<string | null>(null);

  const currentUser = participants.find((p) => p.id === currentUserId);
  const currentUserRole: UserRole = currentUser?.role || 'editor';
  const myRoleInfo = getRoleBadgeInfo(currentUserRole);

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

  const handleRoleSelect = (targetUser: Participant, newRole: UserRole) => {
    setOpenMenuUserId(null);
    if (!onUpdateRole) return;

    if (newRole === 'host') {
      const confirmTransfer = window.confirm(
        `Are you sure you want to transfer Host ownership to ${targetUser.name}?\nYou will become a Co-Host.`
      );
      if (!confirmTransfer) return;
    }

    onUpdateRole(targetUser.id, newRole);
  };

  const handleKick = (targetUser: Participant) => {
    setOpenMenuUserId(null);
    if (!onKickUser) return;

    const confirmKick = window.confirm(
      `Are you sure you want to remove ${targetUser.name} from the workspace?`
    );
    if (!confirmKick) return;

    onKickUser(targetUser.id);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <span className={styles.title}>Participants</span>
          <span className={styles.count}>{participants.length}</span>
        </div>
      </div>

      {/* Current User's Role Banner */}
      <div className={styles.yourRoleBanner}>
        <span className={styles.yourRoleLabel}>Your Authority:</span>
        <span className={`${styles.roleBadge} ${getRoleStyle(currentUserRole)}`} title={myRoleInfo.description}>
          {myRoleInfo.badge}
        </span>
      </div>

      <div className={styles.list}>
        {participants.length === 0 ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyTitle}>No one else is here.</p>
            <p className={styles.emptySubtitle}>Share the room ID to collaborate.</p>
          </div>
        ) : (
          participants.map((user) => {
            const isMe = user.id === currentUserId;
            const isTyping = user.status === 'typing';
            const roleInfo = getRoleBadgeInfo(user.role);
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
                      title={roleInfo.description}
                    >
                      {roleInfo.badge}
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
                      title="Manage participant permissions"
                    >
                      <MoreVertical size={14} />
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
                                    <span className={styles.itemLabel}>{opt.label}</span>
                                    {isActive && <Check size={12} />}
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
                                onClick={() => handleKick(user)}
                              >
                                <span className={styles.itemLabel}>
                                  <UserX size={13} />
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
    </div>
  );
};
