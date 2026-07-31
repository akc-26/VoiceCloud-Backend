/**
 * Shared Permissions & RBAC Module
 * Module: @shared/permissions
 */

import { UserRole } from '../enums';

export enum Permission {
  SYSTEM_ADMIN = 'system:admin',
  USER_READ = 'user:read',
  USER_WRITE = 'user:write',
  USER_BAN = 'user:ban',
  ROOM_CREATE = 'room:create',
  ROOM_MANAGE = 'room:manage',
  ROOM_MODERATE = 'room:moderate',
  CONTENT_CREATE = 'content:create',
  CONTENT_PUBLISH = 'content:publish',
  ANALYTICS_VIEW = 'analytics:view',
  AGENCY_MANAGE = 'agency:manage',
}

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.SUPER_ADMIN]: Object.values(Permission),
  [UserRole.ADMIN]: [
    Permission.USER_READ,
    Permission.USER_WRITE,
    Permission.USER_BAN,
    Permission.ROOM_MANAGE,
    Permission.ROOM_MODERATE,
    Permission.CONTENT_PUBLISH,
    Permission.ANALYTICS_VIEW,
    Permission.AGENCY_MANAGE,
  ],
  [UserRole.CREATOR]: [
    Permission.USER_READ,
    Permission.ROOM_CREATE,
    Permission.ROOM_MANAGE,
    Permission.CONTENT_CREATE,
    Permission.CONTENT_PUBLISH,
    Permission.ANALYTICS_VIEW,
  ],
  [UserRole.USER]: [
    Permission.USER_READ,
    Permission.ROOM_CREATE,
    Permission.CONTENT_CREATE,
  ],
  [UserRole.GUEST]: [
    Permission.USER_READ,
  ],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(Permission.SYSTEM_ADMIN) || permissions.includes(permission);
}
