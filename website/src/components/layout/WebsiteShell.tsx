import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { WebsiteHeader } from './WebsiteHeader';

export function WebsiteShell() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
  }, [location.pathname]);

  return (
    <div className="vc-app-shell">
      <WebsiteHeader />
      <main className="vc-main">
        <div className="vc-route-transition" key={`${location.pathname}${location.search}`}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
