import { createTheme, ThemeOptions } from '@mui/material/styles';
import { THEME_TOKENS } from '@shared';

const baseTypography = {
  fontFamily: THEME_TOKENS.typography.fontFamily,
  h1: { fontWeight: 700, fontSize: '2rem', lineHeight: 1.2 },
  h2: { fontWeight: 700, fontSize: '1.5rem', lineHeight: 1.3 },
  h3: { fontWeight: 600, fontSize: '1.25rem', lineHeight: 1.3 },
  h4: { fontWeight: 600, fontSize: '1.125rem', lineHeight: 1.4 },
  h5: { fontWeight: 600, fontSize: '1rem', lineHeight: 1.4 },
  h6: { fontWeight: 600, fontSize: '0.875rem', lineHeight: 1.4 },
  button: { textTransform: 'none' as const, fontWeight: 600 },
};

export const getCreatorTheme = (mode: 'light' | 'dark') => {
  const isDark = mode === 'dark';

  const themeOptions: ThemeOptions = {
    palette: {
      mode,
      primary: {
        main: THEME_TOKENS.colors.secondary[500] || '#7c3aed', // Creator Violet
        light: '#9333ea',
        dark: THEME_TOKENS.colors.secondary[600] || '#6d28d9',
        contrastText: '#ffffff',
      },
      secondary: {
        main: THEME_TOKENS.colors.primary[500] || '#2563eb', // Accent Blue
        light: '#3b82f6',
        dark: '#1d4ed8',
        contrastText: '#ffffff',
      },
      background: {
        default: isDark ? '#0f172a' : '#f8fafc',
        paper: isDark ? '#1e293b' : '#ffffff',
      },
      text: {
        primary: isDark ? '#f8fafc' : '#0f172a',
        secondary: isDark ? '#94a3b8' : '#64748b',
      },
      success: { main: THEME_TOKENS.colors.status.success, light: '#34d399', dark: '#059669' },
      warning: { main: THEME_TOKENS.colors.status.warning, light: '#fbbf24', dark: '#d97706' },
      error: { main: THEME_TOKENS.colors.status.error, light: '#f87171', dark: '#dc2626' },
      info: { main: THEME_TOKENS.colors.status.info, light: '#60a5fa', dark: '#2563eb' },
      divider: isDark ? 'rgba(148, 163, 184, 0.12)' : 'rgba(226, 232, 240, 0.8)',
    },
    typography: baseTypography,
    shape: {
      borderRadius: 10,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: THEME_TOKENS.borderRadius.md,
            boxShadow: 'none',
            fontWeight: 600,
            padding: '8px 16px',
            '&:hover': {
              boxShadow: '0 4px 12px rgba(124, 58, 237, 0.15)',
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            borderRadius: THEME_TOKENS.borderRadius.lg,
            border: `1px solid ${isDark ? 'rgba(148, 163, 184, 0.12)' : 'rgba(226, 232, 240, 0.9)'}`,
            boxShadow: isDark
              ? '0 4px 20px rgba(0, 0, 0, 0.25)'
              : '0 1px 3px rgba(15, 23, 42, 0.04), 0 1px 2px rgba(15, 23, 42, 0.02)',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          head: {
            fontWeight: 600,
            fontSize: '0.8125rem',
            color: isDark ? '#94a3b8' : '#475569',
            backgroundColor: isDark ? '#0f172a' : '#f1f5f9',
            borderBottom: `1px solid ${isDark ? 'rgba(148, 163, 184, 0.12)' : 'rgba(226, 232, 240, 0.8)'}`,
          },
          body: {
            fontSize: '0.875rem',
            borderBottom: `1px solid ${isDark ? 'rgba(148, 163, 184, 0.08)' : 'rgba(241, 245, 249, 0.9)'}`,
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            fontWeight: 600,
            borderRadius: THEME_TOKENS.borderRadius.sm,
          },
        },
      },
    },
  };

  return createTheme(themeOptions);
};
