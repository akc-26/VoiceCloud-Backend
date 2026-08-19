import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { WebsiteAuthResponse, WebsiteRefreshResponse, WebsiteUser } from './auth.types';

type BootstrapStatus = 'idle' | 'checking' | 'ready';
type AuthIssue = 'session-expired' | null;

interface WebsiteAuthState {
  accessToken: string | null;
  refreshToken: string | null;
  expiresIn: number | null;
  user: WebsiteUser | null;
  sessionId: string | null;
  deviceId: string | null;
  isAuthenticated: boolean;
  bootstrapStatus: BootstrapStatus;
  authIssue: AuthIssue;
  setAuthResponse: (response: WebsiteAuthResponse) => void;
  setRefreshResponse: (response: WebsiteRefreshResponse) => void;
  setUser: (user: WebsiteUser | null) => void;
  setBootstrapStatus: (status: BootstrapStatus) => void;
  markSessionExpired: () => void;
  clearAuth: () => void;
  hasRole: (...roles: string[]) => boolean;
}

const emptyAuth = {
  accessToken: null,
  refreshToken: null,
  expiresIn: null,
  user: null,
  sessionId: null,
  deviceId: null,
  isAuthenticated: false,
} as const;

export const useWebsiteAuthStore = create<WebsiteAuthState>()(
  persist(
    (set, get) => ({
      ...emptyAuth,
      bootstrapStatus: 'idle',
      authIssue: null,

      setAuthResponse: (response) => set({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        expiresIn: response.expiresIn,
        user: response.user,
        sessionId: response.sessionId ?? null,
        deviceId: response.deviceId ?? null,
        isAuthenticated: true,
        bootstrapStatus: 'ready',
        authIssue: null,
      }),

      setRefreshResponse: (response) => set({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        expiresIn: response.expiresIn,
        isAuthenticated: Boolean(get().user),
        authIssue: null,
      }),

      setUser: (user) => set({ user, isAuthenticated: Boolean(user && get().accessToken) }),
      setBootstrapStatus: (bootstrapStatus) => set({ bootstrapStatus }),

      markSessionExpired: () => set({
        ...emptyAuth,
        bootstrapStatus: 'ready',
        authIssue: 'session-expired',
      }),

      clearAuth: () => set({
        ...emptyAuth,
        bootstrapStatus: 'ready',
        authIssue: null,
      }),

      hasRole: (...roles) => {
        const role = get().user?.role;
        return Boolean(role && roles.includes(role));
      },
    }),
    {
      name: 'voicecloud-website-auth-v1',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        expiresIn: state.expiresIn,
        user: state.user,
        sessionId: state.sessionId,
        deviceId: state.deviceId,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
