import { useEffect, type PropsWithChildren } from 'react';
import { apiClient } from '@/api/client';
import { useWebsiteAuthStore } from '@/auth/auth.store';
import type { WebsiteUser } from '@/auth/auth.types';

export function AuthBootstrap({ children }: PropsWithChildren) {
  const accessToken = useWebsiteAuthStore((state) => state.accessToken);
  const status = useWebsiteAuthStore((state) => state.bootstrapStatus);
  const setUser = useWebsiteAuthStore((state) => state.setUser);
  const setStatus = useWebsiteAuthStore((state) => state.setBootstrapStatus);
  const markSessionExpired = useWebsiteAuthStore((state) => state.markSessionExpired);

  useEffect(() => {
    let active = true;
    async function bootstrap() {
      if (!accessToken) {
        setStatus('ready');
        return;
      }
      setStatus('checking');
      try {
        const { data } = await apiClient.get<WebsiteUser>('/auth/me');
        if (!active) return;
        setUser(data);
        setStatus('ready');
      } catch {
        if (!active) return;
        markSessionExpired();
      }
    }
    void bootstrap();
    return () => { active = false; };
  }, [accessToken, markSessionExpired, setStatus, setUser]);

  if (status === 'checking') {
    return <div className="vc-bootstrap" role="status" aria-live="polite"><div className="vc-bootstrap__mark" /><span>Preparing VoiceCloud…</span></div>;
  }
  return children;
}
