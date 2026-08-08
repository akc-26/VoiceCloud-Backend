import { createTheme, ThemeOptions } from '@mui/material/styles';
import { BRAND_CONFIG, THEME_TOKENS } from '@shared';

const creator = BRAND_CONFIG.colors.creator;

const baseTypography = {
  fontFamily: BRAND_CONFIG.typography.creatorFontFamily,
  h1: {
    fontWeight: 700,
    fontSize: '2rem',
    lineHeight: 1.2,
    letterSpacing: '-0.025em',
  },
  h2: {
    fontWeight: 700,
    fontSize: '1.5rem',
    lineHeight: 1.3,
    letterSpacing: '-0.02em',
  },
  h3: { fontWeight: 600, fontSize: '1.25rem', lineHeight: 1.35 },
  h4: { fontWeight: 600, fontSize: '1.125rem', lineHeight: 1.4 },
  h5: { fontWeight: 600, fontSize: '1rem', lineHeight: 1.4 },
  h6: { fontWeight: 600, fontSize: '0.875rem', lineHeight: 1.4 },
  subtitle1: { fontWeight: 600 },
  button: { textTransform: 'none' as const, fontWeight: 600 },
};

export const getCreatorTheme = (mode: 'light' | 'dark') => {
  const isDark = mode === 'dark';
  const surface = isDark ? creator.darkSurface : creator.lightSurface;
  const elevated = isDark
    ? creator.darkElevatedSurface
    : creator.elevatedSurface;
  const border = isDark ? creator.darkBorder : creator.border;
  const textPrimary = isDark ? creator.darkTextPrimary : creator.textPrimary;
  const textSecondary = isDark
    ? creator.darkTextSecondary
    : creator.textSecondary;

  const themeOptions: ThemeOptions = {
    palette: {
      mode,
      primary: {
        main: creator.primary,
        light: creator.primaryLight,
        dark: creator.primaryDark,
        contrastText: '#07130d',
      },
      secondary: {
        main: creator.secondary,
        light: creator.secondaryLight,
        dark: creator.secondaryDark,
        contrastText: '#ffffff',
      },
      success: {
        main: creator.success,
        light: creator.primaryLight,
        dark: creator.primaryDark,
      },
      warning: {
        main: creator.warning,
        light: '#f59e0b',
        dark: '#b45309',
      },
      error: {
        main: creator.error,
        light: '#ef4444',
        dark: '#b91c1c',
      },
      info: {
        main: creator.info,
        light: creator.accent,
        dark: creator.secondary,
      },
      background: {
        default: isDark ? creator.darkBackground : creator.lightBackground,
        paper: surface,
      },
      text: {
        primary: textPrimary,
        secondary: textSecondary,
      },
      divider: border,
      action: {
        hover: isDark ? 'rgba(94, 234, 212, 0.08)' : 'rgba(15, 118, 110, 0.06)',
        selected: isDark
          ? 'rgba(34, 197, 94, 0.14)'
          : 'rgba(34, 197, 94, 0.10)',
        disabledBackground: isDark ? 'rgba(167, 187, 178, 0.10)' : '#e2e8e5',
      },
    },
    typography: baseTypography,
    shape: {
      borderRadius: 12,
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: isDark
              ? creator.darkBackground
              : creator.lightBackground,
            backgroundImage: isDark
              ? 'radial-gradient(circle at 82% -10%, rgba(34, 197, 94, 0.12), transparent 34%), radial-gradient(circle at 14% 110%, rgba(15, 118, 110, 0.12), transparent 28%)'
              : 'radial-gradient(circle at 82% -10%, rgba(34, 197, 94, 0.09), transparent 32%), linear-gradient(180deg, #eef3f1 0%, #e7eceb 100%)',
            color: textPrimary,
          },
          '::selection': {
            backgroundColor: 'rgba(34, 197, 94, 0.24)',
          },
          '@media (prefers-reduced-motion: reduce)': {
            '*': {
              animationDuration: '0.01ms !important',
              animationIterationCount: '1 !important',
              transitionDuration: '0.01ms !important',
            },
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: THEME_TOKENS.borderRadius.md,
            boxShadow: 'none',
            fontWeight: 600,
            minHeight: 38,
            paddingInline: 16,
            '&:focus-visible': {
              outline: `2px solid ${creator.accent}`,
              outlineOffset: 2,
            },
          },
          contained: {
            '&:hover': {
              boxShadow: '0 8px 22px rgba(34, 197, 94, 0.20)',
            },
          },
          outlined: {
            borderColor: border,
            '&:hover': {
              borderColor: creator.primary,
              backgroundColor: isDark
                ? 'rgba(34, 197, 94, 0.08)'
                : 'rgba(34, 197, 94, 0.06)',
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: surface,
            borderRadius: THEME_TOKENS.borderRadius.lg,
            border: `1px solid ${border}`,
            boxShadow: isDark
              ? '0 12px 34px rgba(0, 0, 0, 0.22)'
              : '0 6px 22px rgba(16, 35, 31, 0.055)',
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
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: THEME_TOKENS.borderRadius.md,
            backgroundColor: isDark
              ? 'rgba(255,255,255,0.025)'
              : 'rgba(255,255,255,0.72)',
            '& .MuiOutlinedInput-notchedOutline': { borderColor: border },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: creator.secondaryLight,
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: creator.primary,
              borderWidth: 2,
            },
          },
        },
      },
      MuiInputLabel: {
        styleOverrides: {
          root: {
            fontWeight: 500,
          },
        },
      },
      MuiTableContainer: {
        styleOverrides: {
          root: {
            borderRadius: THEME_TOKENS.borderRadius.md,
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          head: {
            fontWeight: 600,
            fontSize: '0.8125rem',
            color: textSecondary,
            backgroundColor: isDark ? '#172820' : '#e8efec',
            borderBottom: `1px solid ${border}`,
          },
          body: {
            fontSize: '0.875rem',
            borderBottom: `1px solid ${border}`,
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            '&:hover': {
              backgroundColor: isDark
                ? 'rgba(94, 234, 212, 0.045)'
                : 'rgba(34, 197, 94, 0.035)',
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            fontWeight: 600,
            borderRadius: THEME_TOKENS.borderRadius.sm,
            '&.MuiChip-filled.MuiChip-colorPrimary': {
              backgroundColor: isDark
                ? 'rgba(34, 197, 94, 0.18)'
                : creator.navigationSelected,
              color: isDark ? creator.primaryLight : creator.primaryDark,
            },
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            backgroundColor: elevated,
            border: `1px solid ${border}`,
            borderRadius: THEME_TOKENS.borderRadius.lg,
            boxShadow: '0 24px 70px rgba(4, 18, 12, 0.28)',
          },
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            backgroundColor: elevated,
            border: `1px solid ${border}`,
            borderRadius: THEME_TOKENS.borderRadius.md,
          },
        },
      },
      MuiTabs: {
        styleOverrides: {
          indicator: {
            height: 3,
            borderRadius: 999,
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 600,
          },
        },
      },
      MuiSwitch: {
        styleOverrides: {
          switchBase: {
            '&.Mui-checked': {
              color: creator.primary,
              '& + .MuiSwitch-track': {
                backgroundColor: creator.primary,
              },
            },
          },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: THEME_TOKENS.borderRadius.md,
            '&.MuiAlert-standard.MuiAlert-colorSuccess': {
              backgroundColor: isDark ? 'rgba(22, 163, 74, 0.14)' : '#ecfdf3',
            },
            '&.MuiAlert-standard.MuiAlert-colorWarning': {
              backgroundColor: isDark ? 'rgba(217, 119, 6, 0.14)' : '#fff8e8',
            },
            '&.MuiAlert-standard.MuiAlert-colorError': {
              backgroundColor: isDark ? 'rgba(220, 38, 38, 0.14)' : '#fff1f2',
            },
            '&.MuiAlert-standard.MuiAlert-colorInfo': {
              backgroundColor: isDark ? 'rgba(14, 165, 164, 0.14)' : '#ecfeff',
            },
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: '#0c211a',
            borderRadius: 8,
            fontSize: '0.75rem',
          },
        },
      },
      MuiAvatar: {
        styleOverrides: {
          root: {
            backgroundColor: creator.secondary,
          },
        },
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: {
            height: 7,
            borderRadius: 999,
            backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#dfe9e4',
          },
          bar: {
            borderRadius: 999,
          },
        },
      },
      MuiPaginationItem: {
        styleOverrides: {
          root: {
            borderRadius: 8,
          },
        },
      },
      MuiSkeleton: {
        styleOverrides: {
          root: {
            backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#dfe8e4',
          },
        },
      },
    },
  };

  return createTheme(themeOptions);
};
