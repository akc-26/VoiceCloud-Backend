import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  WebsiteAuthResponse,
  WebsiteRefreshResponse,
  WebsiteUser,
} from './auth.types';

interface WebsiteAuthState {
  accessToken: string | null;
  refreshToken: string | null;
  expiresIn: number | null;
  user: WebsiteUser | null;
  sessionId: string | null;
  deviceId: string | null;
  isAuthenticated: boolean;
  bootstrapStatus: 'idle' | 'checking' | 'ready';
  setAuthResponse: (response: WebsiteAuthResponse) => void;
  setRefreshResponse: (response: WebsiteRefreshResponse) => void;
  setUser: (user: WebsiteUser | null) => void;
  setBootstrapStatus: (status: WebsiteAuthState['bootstrapStatus']) => void;
  clearAuth: () => void;
  hasRole: (...roles: string[]) => boolean;
}

export const useWebsiteAuthStore = create<WebsiteAuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      expiresIn: null,
      user: null,
      sessionId: null,
      deviceId: null,
      isAuthenticated: false,
      bootstrapStatus: 'idle',

      setAuthResponse: (response) =>
        set({
          accessToken: response.accessToken,
          refreshToken: response.refreshToken,
          expiresIn: response.expiresIn,
          user: response.user,
          sessionId: response.sessionId ?? null,
          deviceId: response.deviceId ?? null,
          isAuthenticated: true,
          bootstrapStatus: 'ready',
        }),

      setRefreshResponse: (response) =>
        set({
          accessToken: response.accessToken,
          refreshToken: response.refreshToken,
          expiresIn: response.expiresIn,
          isAuthenticated: Boolean(get().user),
        }),

      setUser: (user) =>
        set({ user, isAuthenticated: Boolean(user && get().accessToken) }),

      setBootstrapStatus: (bootstrapStatus) => set({ bootstrapStatus }),

      clearAuth: () =>
        set({
          accessToken: null,
          refreshToken: null,
          expiresIn: null,
          user: null,
          sessionId: null,
          deviceId: null,
          isAuthenticated: false,
          bootstrapStatus: 'ready',
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
