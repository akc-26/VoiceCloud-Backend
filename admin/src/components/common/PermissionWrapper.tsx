import React from 'react';
import { useAuthStore, UserRole } from '../../store/auth.store';
import { usePermissionsStore, Permission } from '../../store/permissions.store';

interface PermissionWrapperProps {
  roles?: UserRole[];
  permission?: Permission;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const PermissionWrapper: React.FC<PermissionWrapperProps> = ({
  roles,
  permission,
  children,
  fallback = null,
}) => {
  const user = useAuthStore((state) => state.user);
  const hasRole = useAuthStore((state) => state.hasRole);
  const hasPermission = usePermissionsStore((state) => state.hasPermission);

  if (!user) return <>{fallback}</>;

  if (roles && !hasRole(roles)) {
    return <>{fallback}</>;
  }

  if (permission && !hasPermission(user.role, permission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
