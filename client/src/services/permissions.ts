import { UserRole } from '../types';

export interface RoleBadgeInfo {
  label: string;
  badge: string;
  color: string;
  bg: string;
  border: string;
  description: string;
}

export const ROLE_INFO: Record<UserRole, RoleBadgeInfo> = {
  host: {
    label: 'Host',
    badge: '👑 Host',
    color: '#eab308', // amber
    bg: 'rgba(234, 179, 8, 0.15)',
    border: 'rgba(234, 179, 8, 0.4)',
    description: 'Room owner with complete authority and ownership transfer rights.',
  },
  'co-host': {
    label: 'Co-Host',
    badge: '🛡️ Co-Host',
    color: '#38bdf8', // sky blue
    bg: 'rgba(56, 189, 248, 0.15)',
    border: 'rgba(56, 189, 248, 0.4)',
    description: 'Co-manager with moderation, role assignment, and kicking rights.',
  },
  admin: {
    label: 'Admin',
    badge: '⚡ Admin',
    color: '#a855f7', // purple
    bg: 'rgba(168, 85, 247, 0.15)',
    border: 'rgba(168, 85, 247, 0.4)',
    description: 'Moderator who can manage files and kick standard participants.',
  },
  editor: {
    label: 'Editor',
    badge: '✏️ Editor',
    color: '#22c55e', // green
    bg: 'rgba(34, 197, 94, 0.15)',
    border: 'rgba(34, 197, 94, 0.4)',
    description: 'Active collaborator who can edit code, create files, and run code.',
  },
  viewer: {
    label: 'Viewer',
    badge: '👁️ Viewer',
    color: '#94a3b8', // slate/gray
    bg: 'rgba(148, 163, 184, 0.15)',
    border: 'rgba(148, 163, 184, 0.4)',
    description: 'Read-only observer who cannot modify code or run commands.',
  },
  participant: {
    label: 'Editor',
    badge: '✏️ Editor',
    color: '#22c55e',
    bg: 'rgba(34, 197, 94, 0.15)',
    border: 'rgba(34, 197, 94, 0.4)',
    description: 'Active collaborator.',
  },
};

export function getRoleBadgeInfo(role?: UserRole): RoleBadgeInfo {
  if (!role || !ROLE_INFO[role]) {
    return ROLE_INFO.editor;
  }
  return ROLE_INFO[role];
}

export function canEditCode(role?: UserRole): boolean {
  if (!role) return false;
  return role !== 'viewer';
}

export function canRunCode(role?: UserRole): boolean {
  if (!role) return false;
  return role !== 'viewer';
}

export function canManageFiles(role?: UserRole): boolean {
  if (!role) return false;
  return role !== 'viewer';
}

export function canUseTerminal(role?: UserRole): boolean {
  if (!role) return false;
  return role !== 'viewer';
}

export function canManageRoles(actorRole?: UserRole): boolean {
  return actorRole === 'host' || actorRole === 'co-host';
}

export function canChangeTargetRole(
  actorRole: UserRole,
  targetRole: UserRole,
  newRole: UserRole
): boolean {
  if (actorRole === 'host') {
    return true; // Host can assign anything (including host transfer)
  }
  if (actorRole === 'co-host') {
    // Co-host cannot touch Host, cannot assign Host, cannot assign Co-host
    if (targetRole === 'host' || targetRole === 'co-host') return false;
    if (newRole === 'host' || newRole === 'co-host') return false;
    return true;
  }
  return false;
}

export function canKickUser(actorRole?: UserRole, targetRole?: UserRole): boolean {
  if (!actorRole || !targetRole) return false;
  if (actorRole === 'host') {
    return true; // Host can kick anyone except themselves (handled in UI)
  }
  if (actorRole === 'co-host') {
    return targetRole !== 'host' && targetRole !== 'co-host';
  }
  if (actorRole === 'admin') {
    return targetRole === 'editor' || targetRole === 'viewer' || targetRole === 'participant';
  }
  return false;
}

export function getAssignableRoles(actorRole?: UserRole): { role: UserRole; label: string }[] {
  if (actorRole === 'host') {
    return [
      { role: 'host', label: '👑 Transfer Host' },
      { role: 'co-host', label: '🛡️ Co-Host' },
      { role: 'admin', label: '⚡ Admin' },
      { role: 'editor', label: '✏️ Editor' },
      { role: 'viewer', label: '👁️ Viewer' },
    ];
  }
  if (actorRole === 'co-host') {
    return [
      { role: 'admin', label: '⚡ Admin' },
      { role: 'editor', label: '✏️ Editor' },
      { role: 'viewer', label: '👁️ Viewer' },
    ];
  }
  return [];
}
