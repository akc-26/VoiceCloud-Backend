import { create } from 'zustand';
import { AdminUser } from './auth.store';

interface UserState {
  profile: AdminUser | null;
  isLoading: boolean;
  error: string | null;
  setProfile: (profile: AdminUser) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useUserStore = create<UserState>((set) => ({
  profile: null,
  isLoading: false,
  error: null,
  setProfile: (profile: AdminUser) => set({ profile }),
  setLoading: (isLoading: boolean) => set({ isLoading }),
  setError: (error: string | null) => set({ error }),
}));
