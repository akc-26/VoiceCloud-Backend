import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR' | 'SUPPORT';

export interface AdminUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  role: UserRole;
  avatarUrl?: string;
  isSuperAdmin?: boolean;
  isStaff?: boolean;
}

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: AdminUser | null;
  isAuthenticated: boolean;
  setAuth: (token: string, refreshToken: string, user: AdminUser) => void;
  updateUser: (userPartial: Partial<AdminUser>) => void;
  logout: () => void;
  hasRole: (roles: UserRole[]) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,

      setAuth: (token: string, refreshToken: string, user: AdminUser) => {
        set({
          token,
          refreshToken,
          user,
          isAuthenticated: true,
        });
      },

      updateUser: (userPartial: Partial<AdminUser>) => {
        const currentUser = get().user;
        if (currentUser) {
          set({ user: { ...currentUser, ...userPartial } });
        }
      },

      logout: () => {
        set({
          token: null,
          refreshToken: null,
          user: null,
          isAuthenticated: false,
        });
      },

      hasRole: (roles: UserRole[]) => {
        const currentUser = get().user;
        if (!currentUser) return false;
        // SUPER_ADMIN has access to everything
        if (currentUser.role === 'SUPER_ADMIN' || currentUser.isSuperAdmin) return true;
        return roles.includes(currentUser.role);
      },
    }),
    {
      name: 'voicecloud_admin_auth_v3',
    },
  ),
);
