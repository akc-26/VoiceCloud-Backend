import { create } from 'zustand';

interface ThemeState {
  mode: 'light' | 'dark';
  toggleTheme: () => void;
  setMode: (mode: 'light' | 'dark') => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  mode: (localStorage.getItem('creator_theme_mode') as 'light' | 'dark') || 'light',
  toggleTheme: () =>
    set((state) => {
      const nextMode = state.mode === 'light' ? 'dark' : 'light';
      localStorage.setItem('creator_theme_mode', nextMode);
      return { mode: nextMode };
    }),
  setMode: (mode) => {
    localStorage.setItem('creator_theme_mode', mode);
    set({ mode });
  },
}));
