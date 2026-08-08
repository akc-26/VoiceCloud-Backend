import { createTheme, ThemeOptions } from '@mui/material/styles';
import { BRAND_CONFIG } from '@shared/branding';

const baseTypography = {
  fontFamily: BRAND_CONFIG.typography.fontFamily,
  h1: { fontWeight: 700, fontSize: '2.25rem', lineHeight: 1.2 },
  h2: { fontWeight: 700, fontSize: '1.75rem', lineHeight: 1.3 },
  h3: { fontWeight: 600, fontSize: '1.5rem', lineHeight: 1.3 },
  h4: { fontWeight: 600, fontSize: '1.25rem', lineHeight: 1.4 },
  h5: { fontWeight: 600, fontSize: '1rem', lineHeight: 1.4 },
  h6: { fontWeight: 600, fontSize: '0.875rem', lineHeight: 1.4 },
  button: { textTransform: 'none' as const, fontWeight: 600 },
};

export const getAppTheme = (mode: 'light' | 'dark') => {
  const isDark = mode === 'dark';

  const themeOptions: ThemeOptions = {
    palette: {
      mode,
      primary: {
        main: BRAND_CONFIG.colors.admin.primary,
        light: BRAND_CONFIG.colors.admin.primaryLight,
        dark: BRAND_CONFIG.colors.admin.primaryDark,
        contrastText: '#ffffff',
      },
      secondary: {
        main: BRAND_CONFIG.colors.admin.secondary,
        light: BRAND_CONFIG.colors.admin.secondaryLight,
        dark: BRAND_CONFIG.colors.admin.secondaryDark,
        contrastText: '#ffffff',
      },
      background: {
        default: isDark
          ? BRAND_CONFIG.colors.admin.darkBackground
          : BRAND_CONFIG.colors.admin.lightBackground,
        paper: isDark
          ? BRAND_CONFIG.colors.admin.darkSurface
          : BRAND_CONFIG.colors.common.white,
      },
      text: {
        primary: isDark
          ? BRAND_CONFIG.colors.common.neutral100
          : BRAND_CONFIG.colors.common.neutral900,
        secondary: isDark ? '#94a3b8' : '#64748b',
      },
      success: {
        main: BRAND_CONFIG.colors.common.success,
        light: '#34d399',
        dark: '#059669',
      },
      warning: {
        main: BRAND_CONFIG.colors.common.warning,
        light: '#fbbf24',
        dark: '#d97706',
      },
      error: {
        main: BRAND_CONFIG.colors.common.error,
        light: '#f87171',
        dark: '#dc2626',
      },
      info: {
        main: BRAND_CONFIG.colors.common.info,
        light: '#60a5fa',
        dark: BRAND_CONFIG.colors.website.primary,
      },
      divider: isDark
        ? 'rgba(148, 163, 184, 0.12)'
        : 'rgba(226, 232, 240, 0.8)',
    },
    typography: baseTypography,
    shape: {
      borderRadius: 10,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: '8px',
            boxShadow: 'none',
            padding: '8px 16px',
            '&:hover': {
              boxShadow: '0 4px 12px rgba(29, 78, 216, 0.15)',
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            borderRadius: '12px',
            border: `1px solid ${isDark ? 'rgba(148, 163, 184, 0.12)' : 'rgba(226, 232, 240, 0.8)'}`,
            boxShadow: isDark
              ? '0 4px 20px rgba(0, 0, 0, 0.2)'
              : '0 1px 3px rgba(15, 23, 42, 0.05), 0 1px 2px rgba(15, 23, 42, 0.03)',
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
            backgroundColor: isDark ? '#111827' : '#f1f5f9',
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
            borderRadius: '6px',
          },
        },
      },
    },
  };

  return createTheme(themeOptions);
};
