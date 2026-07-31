import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface UserAuthProfileDto {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  phoneNumber?: string;
  avatarUrl?: string;
  isVerified: boolean;
  isVip: boolean;
  isGuest: boolean;
  role: string;
  referralCode?: string;
}

export interface AuthResponseDto {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: UserAuthProfileDto;
  sessionId?: string;
  deviceId?: string;
}

interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  expiresIn: number | null;
  user: UserAuthProfileDto | null;
  userId: string;
  creatorId: string;
  role: string;

  setAuthResponse: (response: AuthResponseDto) => void;
  setAuth: (payload: { userId: string; creatorId: string; token: string }) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      token: null,
      accessToken: null,
      refreshToken: null,
      expiresIn: null,
      user: null,
      userId: '',
      creatorId: '',
      role: 'CREATOR',

      setAuthResponse: (response: AuthResponseDto) =>
        set({
          isAuthenticated: true,
          token: response.accessToken,
          accessToken: response.accessToken,
          refreshToken: response.refreshToken || null,
          expiresIn: response.expiresIn || null,
          user: response.user || null,
          userId: response.user?.id || '',
          creatorId: response.user?.id || '',
          role: response.user?.role || 'CREATOR',
        }),

      setAuth: ({ userId, creatorId, token }) =>
        set({
          isAuthenticated: true,
          token,
          accessToken: token,
          userId,
          creatorId,
          role: 'CREATOR',
        }),

      logout: () => {
        set({
          isAuthenticated: false,
          token: null,
          accessToken: null,
          refreshToken: null,
          expiresIn: null,
          user: null,
          userId: '',
          creatorId: '',
          role: 'CREATOR',
        });
        try {
          localStorage.removeItem('voicecloud-creator-auth');
        } catch {
          // Ignore localStorage issues
        }
      },
    }),
    {
      name: 'voicecloud-creator-auth',
    }
  )
);


