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
    badge: 'Host',
    color: '#f59e0b', // amber
    bg: 'rgba(245, 158, 11, 0.12)',
    border: 'rgba(245, 158, 11, 0.35)',
    description: 'Workspace owner with full administrative authority, role management, and succession control.',
  },
  'co-host': {
    label: 'Co-Host',
    badge: 'Co-Host',
    color: '#38bdf8', // sky blue
    bg: 'rgba(56, 189, 248, 0.12)',
    border: 'rgba(56, 189, 248, 0.35)',
    description: 'Moderation lead with room settings access, role assignments, and participant management.',
  },
  admin: {
    label: 'Admin',
    badge: 'Admin',
    color: '#a855f7', // purple
    bg: 'rgba(168, 85, 247, 0.12)',
    border: 'rgba(168, 85, 247, 0.35)',
    description: 'Workspace moderator with file management and participant moderation authority.',
  },
  editor: {
    label: 'Editor',
    badge: 'Editor',
    color: '#22c55e', // green
    bg: 'rgba(34, 197, 94, 0.12)',
    border: 'rgba(34, 197, 94, 0.35)',
    description: 'Active contributor with full code editing, file creation, and execution capabilities.',
  },
  viewer: {
    label: 'Viewer',
    badge: 'Viewer',
    color: '#94a3b8', // slate
    bg: 'rgba(148, 163, 184, 0.12)',
    border: 'rgba(148, 163, 184, 0.35)',
    description: 'Read-only observer with code viewing permissions.',
  },
  participant: {
    label: 'Editor',
    badge: 'Editor',
    color: '#22c55e',
    bg: 'rgba(34, 197, 94, 0.12)',
    border: 'rgba(34, 197, 94, 0.35)',
    description: 'Active collaborator.',
  },
};

export interface RoleCapability {
  title: string;
  description: string;
  canEdit: boolean;
  canRun: boolean;
  canManageFiles: boolean;
  canManageRoles: boolean;
  canKick: boolean;
  canSettings: boolean;
}

export const ROLE_CAPABILITIES: Record<UserRole, RoleCapability> = {
  host: {
    title: 'Host',
    description: 'Workspace owner with full administrative authority, role management, and succession control.',
    canEdit: true,
    canRun: true,
    canManageFiles: true,
    canManageRoles: true,
    canKick: true,
    canSettings: true,
  },
  'co-host': {
    title: 'Co-Host',
    description: 'Moderation lead with room settings access, role assignments, and participant moderation.',
    canEdit: true,
    canRun: true,
    canManageFiles: true,
    canManageRoles: true,
    canKick: true,
    canSettings: true,
  },
  admin: {
    title: 'Admin',
    description: 'Moderator with file operations, code execution, and standard participant moderation.',
    canEdit: true,
    canRun: true,
    canManageFiles: true,
    canManageRoles: false,
    canKick: true,
    canSettings: false,
  },
  editor: {
    title: 'Editor',
    description: 'Active collaborator with code editing, file authoring, and execution access.',
    canEdit: true,
    canRun: true,
    canManageFiles: true,
    canManageRoles: false,
    canKick: false,
    canSettings: false,
  },
  viewer: {
    title: 'Viewer',
    description: 'Read-only observer without code editing, terminal execution, or file modifications.',
    canEdit: false,
    canRun: false,
    canManageFiles: false,
    canManageRoles: false,
    canKick: false,
    canSettings: false,
  },
  participant: {
    title: 'Editor',
    description: 'Active collaborator with code editing and file authoring.',
    canEdit: true,
    canRun: true,
    canManageFiles: true,
    canManageRoles: false,
    canKick: false,
    canSettings: false,
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
    return true; // Host can assign any role
  }
  if (actorRole === 'co-host') {
    // Co-host cannot modify Host or Co-Host, nor promote to Host or Co-Host
    if (targetRole === 'host' || targetRole === 'co-host') return false;
    if (newRole === 'host' || newRole === 'co-host') return false;
    return true;
  }
  return false;
}

export function canKickUser(actorRole?: UserRole, targetRole?: UserRole): boolean {
  if (!actorRole || !targetRole) return false;
  if (actorRole === 'host') {
    return true; // Host can kick anyone except themselves
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
      { role: 'host', label: 'Transfer Host' },
      { role: 'co-host', label: 'Make Co-Host' },
      { role: 'admin', label: 'Set as Admin' },
      { role: 'editor', label: 'Set as Editor' },
      { role: 'viewer', label: 'Set as Viewer' },
    ];
  }
  if (actorRole === 'co-host') {
    return [
      { role: 'admin', label: 'Set as Admin' },
      { role: 'editor', label: 'Set as Editor' },
      { role: 'viewer', label: 'Set as Viewer' },
    ];
  }
  return [];
}
