import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  isAuthenticated: boolean;
  userId: string;
  creatorId: string;
  role: string;
  token: string | null;
  setAuth: (payload: { userId: string; creatorId: string; token: string }) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      userId: '',
      creatorId: '',
      role: 'CREATOR',
      token: null,
      setAuth: ({ userId, creatorId, token }) =>
        set({
          isAuthenticated: true,
          userId,
          creatorId,
          role: 'CREATOR',
          token,
        }),
      logout: () =>
        set({
          isAuthenticated: false,
          userId: '',
          creatorId: '',
          token: null,
        }),
    }),
    {
      name: 'voicecloud-creator-auth',
    }
  )
);

