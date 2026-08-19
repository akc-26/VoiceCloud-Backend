import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useWebsiteAuthStore } from '@/auth/auth.store';

export function RequireAuth() {
  const isAuthenticated = useWebsiteAuthStore((state) => state.isAuthenticated);
  const location = useLocation();

  if (!isAuthenticated) {
    return (
      <Navigate
        replace
        to="/auth/sign-in"
        state={{ returnTo: `${location.pathname}${location.search}` }}
      />
    );
  }

  return <Outlet />;
}
