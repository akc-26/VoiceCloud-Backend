import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useWebsiteAuthStore } from '@/auth/auth.store';

export function RequireAuth() {
  const isAuthenticated = useWebsiteAuthStore((state) => state.isAuthenticated);
  const authIssue = useWebsiteAuthStore((state) => state.authIssue);
  const location = useLocation();

  if (!isAuthenticated) {
    if (authIssue === 'session-expired') {
      return <Navigate replace to="/auth/session-expired" state={{ returnTo: `${location.pathname}${location.search}` }} />;
    }
    return <Navigate replace to="/auth/sign-in" state={{ returnTo: `${location.pathname}${location.search}` }} />;
  }
  return <Outlet />;
}
