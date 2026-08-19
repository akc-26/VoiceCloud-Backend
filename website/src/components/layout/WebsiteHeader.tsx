import { Bell, ChevronDown, Globe2, Menu, Search } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { BrandLogo } from '@/components/common/BrandLogo';
import { useWebsiteAuthStore } from '@/auth/auth.store';

const navigation = [
  ['Home', '/'],
  ['Explore', '/explore'],
  ['Communities', '/communities'],
  ['People', '/people'],
  ['Events', '/events'],
  ['About', '/about'],
] as const;

export function WebsiteHeader() {
  const navigate = useNavigate();
  const user = useWebsiteAuthStore((state) => state.user);
  const isAuthenticated = useWebsiteAuthStore((state) => state.isAuthenticated);

  return (
    <header className="vc-header">
      <div className="vc-header__inner">
        <BrandLogo />
        <nav className="vc-header__nav" aria-label="Primary navigation">
          {navigation.map(([label, to]) => (
            <NavLink key={to} to={to} end={to === '/'}>
              {label}
            </NavLink>
          ))}
        </nav>
        <button className="vc-header__search" type="button" onClick={() => navigate('/search')}>
          <Search size={17} aria-hidden="true" />
          <span>Search VoiceCloud</span>
          <kbd>⌘K</kbd>
        </button>
        <div className="vc-header__actions">
          <button className="vc-icon-button vc-desktop-only" type="button" aria-label="Language">
            <Globe2 size={19} />
          </button>
          {isAuthenticated ? (
            <>
              <button className="vc-icon-button" type="button" aria-label="Notifications" onClick={() => navigate('/notifications')}>
                <Bell size={19} />
              </button>
              {user?.isGuest ? <button className="vc-header__upgrade" type="button" onClick={() => navigate('/auth/guest/upgrade')}>Upgrade Guest</button> : null}
              <button className="vc-profile-button" type="button" onClick={() => navigate('/me')}>
                {user?.avatarUrl ? <img src={user.avatarUrl} alt="" /> : <span>{user?.displayName?.[0] ?? 'V'}</span>}
                <strong>{user?.displayName ?? 'My Profile'}</strong>
                <ChevronDown size={15} />
              </button>
            </>
          ) : (
            <button className="vc-header__signin" type="button" onClick={() => navigate('/auth/sign-in')}>
              Sign In
            </button>
          )}
          <button className="vc-icon-button vc-mobile-menu" type="button" aria-label="Open navigation menu">
            <Menu size={21} />
          </button>
        </div>
      </div>
    </header>
  );
}
