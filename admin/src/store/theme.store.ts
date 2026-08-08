import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeState {
  mode: 'light' | 'dark';
  sidebarCollapsed: boolean;
  mobileSidebarOpen: boolean;
  toggleTheme: () => void;
  setThemeMode: (mode: 'light' | 'dark') => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleMobileSidebar: () => void;
  setMobileSidebarOpen: (open: boolean) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: 'light',
      sidebarCollapsed: false,
      mobileSidebarOpen: false,
      toggleTheme: () =>
        set((state) => ({ mode: state.mode === 'light' ? 'dark' : 'light' })),
      setThemeMode: (mode: 'light' | 'dark') => set({ mode }),
      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (sidebarCollapsed: boolean) =>
        set({ sidebarCollapsed }),
      toggleMobileSidebar: () =>
        set((state) => ({ mobileSidebarOpen: !state.mobileSidebarOpen })),
      setMobileSidebarOpen: (mobileSidebarOpen: boolean) =>
        set({ mobileSidebarOpen }),
    }),
    {
      name: 'voicecloud_admin_theme',
      partialize: (state) => ({
        mode: state.mode,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    },
  ),
);
