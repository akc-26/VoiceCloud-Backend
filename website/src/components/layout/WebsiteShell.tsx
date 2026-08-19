import { Outlet } from 'react-router-dom';
import { WebsiteHeader } from './WebsiteHeader';

export function WebsiteShell() {
  return (
    <div className="vc-app-shell">
      <WebsiteHeader />
      <main className="vc-main">
        <Outlet />
      </main>
    </div>
  );
}
