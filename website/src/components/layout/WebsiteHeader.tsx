import { FormEvent, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bell, ChevronDown, Globe2, Menu, Mic2, Search } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { BrandLogo } from '@/components/common/BrandLogo';
import { useWebsiteAuthStore } from '@/auth/auth.store';
import { notificationsApi } from '@/features/notifications/notifications.api';

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
  const [searchText, setSearchText] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const unread = useQuery({
    queryKey: ['ph04', 'notifications', 'unread'],
    queryFn: notificationsApi.unreadCount,
    enabled: isAuthenticated,
    refetchInterval: 60_000,
  });

  useEffect(() => {
    function onShortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener('keydown', onShortcut);
    return () => window.removeEventListener('keydown', onShortcut);
  }, []);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = searchText.trim();
    if (!query) {
      searchRef.current?.focus();
      return;
    }
    navigate(`/search?q=${encodeURIComponent(query)}`);
  }

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
        <form className="vc-header__search" role="search" onSubmit={submitSearch}>
          <button type="submit" aria-label="Search VoiceCloud"><Search size={17} aria-hidden="true" /></button>
          <input
            ref={searchRef}
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Search VoiceCloud"
            aria-label="Search VoiceCloud"
          />
          <kbd>⌘K</kbd>
        </form>
        <div className="vc-header__actions">
          <button className="vc-icon-button vc-desktop-only" type="button" aria-label="Language">
            <Globe2 size={19} />
          </button>
          {isAuthenticated ? (
            <>
              <button className="vc-icon-button" type="button" aria-label="Notifications" onClick={() => navigate('/notifications')}>
                <Bell size={19} />{unread.data?.unreadCount ? <span className="vc-notification-badge">{unread.data.unreadCount > 99 ? '99+' : unread.data.unreadCount}</span> : null}
              </button>
              {user?.isGuest ? <button className="vc-header__upgrade" type="button" onClick={() => navigate('/auth/guest/upgrade')}>Upgrade Guest</button> : null}
              {user?.role === 'CREATOR' || user?.isCreatorEnabled ? <button className="vc-header__host" type="button" onClick={() => navigate('/host/rooms')}><Mic2 size={16}/> My Rooms</button> : null}
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
