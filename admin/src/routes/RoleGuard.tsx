import React from 'react';
import { useAuthStore, UserRole } from '../store/auth.store';
import { UnauthorizedPage } from '../pages/UnauthorizedPage';

interface RoleGuardProps {
  roles?: UserRole[];
  children: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ roles, children }) => {
  const hasRole = useAuthStore((state) => state.hasRole);

  if (roles && !hasRole(roles)) {
    return <UnauthorizedPage />;
  }

  return <>{children}</>;
};
