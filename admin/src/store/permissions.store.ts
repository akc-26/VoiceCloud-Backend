import { create } from 'zustand';
import { UserRole } from './auth.store';

export type Permission =
  | 'manage:all'
  | 'manage:users'
  | 'view:users'
  | 'manage:rooms'
  | 'view:rooms'
  | 'manage:wallet'
  | 'view:wallet'
  | 'manage:gifts'
  | 'manage:vip'
  | 'manage:hosts'
  | 'manage:agencies'
  | 'manage:reports'
  | 'manage:moderation'
  | 'manage:announcements'
  | 'manage:notifications'
  | 'manage:rtc'
  | 'manage:cms'
  | 'manage:feature_flags'
  | 'manage:provider_configs'
  | 'manage:system_settings'
  | 'manage:app_versions'
  | 'view:audit_logs'
  | 'view:analytics';

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  SUPER_ADMIN: ['manage:all'],
  ADMIN: [
    'manage:users',
    'view:users',
    'manage:rooms',
    'view:rooms',
    'manage:wallet',
    'view:wallet',
    'manage:gifts',
    'manage:vip',
    'manage:hosts',
    'manage:agencies',
    'manage:reports',
    'manage:moderation',
    'manage:announcements',
    'manage:notifications',
    'manage:rtc',
    'manage:cms',
    'manage:feature_flags',
    'manage:provider_configs',
    'manage:system_settings',
    'manage:app_versions',
    'view:audit_logs',
    'view:analytics',
  ],
  MODERATOR: [
    'view:users',
    'manage:users',
    'view:rooms',
    'manage:rooms',
    'manage:reports',
    'manage:moderation',
    'manage:announcements',
    'manage:notifications',
    'view:audit_logs',
  ],
  SUPPORT: [
    'view:users',
    'view:rooms',
    'view:wallet',
    'manage:reports',
    'manage:notifications',
  ],
};

interface PermissionsState {
  hasPermission: (role: UserRole | undefined, permission: Permission) => boolean;
  getPermissionsForRole: (role: UserRole) => Permission[];
}

export const usePermissionsStore = create<PermissionsState>(() => ({
  hasPermission: (role: UserRole | undefined, permission: Permission) => {
    if (!role) return false;
    if (role === 'SUPER_ADMIN') return true;
    const permissions = ROLE_PERMISSIONS[role] || [];
    return permissions.includes('manage:all') || permissions.includes(permission);
  },

  getPermissionsForRole: (role: UserRole) => {
    return ROLE_PERMISSIONS[role] || [];
  },
}));
