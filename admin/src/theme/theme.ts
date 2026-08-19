import { alpha, createTheme, ThemeOptions } from '@mui/material/styles';
import { BRAND_CONFIG } from '@shared/branding';

const admin = BRAND_CONFIG.colors.admin;
const common = BRAND_CONFIG.colors.common;

const baseTypography = {
  fontFamily: BRAND_CONFIG.typography.adminFontFamily,
  h1: { fontWeight: 700, fontSize: '2.5rem', lineHeight: 1.2, letterSpacing: '-0.035em' },
  h2: { fontWeight: 700, fontSize: '2rem', lineHeight: 1.25, letterSpacing: '-0.025em' },
  h3: { fontWeight: 650, fontSize: '1.625rem', lineHeight: 1.3, letterSpacing: '-0.02em' },
  h4: { fontWeight: 700, fontSize: '1.375rem', lineHeight: 1.35, letterSpacing: '-0.02em' },
  h5: { fontWeight: 650, fontSize: '1.125rem', lineHeight: 1.4, letterSpacing: '-0.015em' },
  h6: { fontWeight: 650, fontSize: '0.95rem', lineHeight: 1.4 },
  subtitle1: { fontWeight: 600, fontSize: '0.9375rem', lineHeight: 1.5 },
  subtitle2: { fontWeight: 600, fontSize: '0.8125rem', lineHeight: 1.45 },
  body1: { fontWeight: 400, fontSize: '0.9375rem', lineHeight: 1.55 },
  body2: { fontWeight: 400, fontSize: '0.8125rem', lineHeight: 1.55 },
  caption: { fontWeight: 400, fontSize: '0.75rem', lineHeight: 1.45 },
  button: { textTransform: 'none' as const, fontWeight: 600, letterSpacing: 0 },
};

export const getAppTheme = (mode: 'light' | 'dark') => {
  const isDark = mode === 'dark';
  const backgroundDefault = isDark ? admin.darkBackground : admin.lightBackground;
  const surface = isDark ? admin.darkSurface : admin.lightSurface;
  const elevatedSurface = isDark ? admin.darkElevatedSurface : admin.elevatedSurface;
  const border = isDark ? admin.darkBorder : admin.border;
  const textPrimary = isDark ? admin.darkTextPrimary : admin.textPrimary;
  const textSecondary = isDark ? admin.darkTextSecondary : admin.textSecondary;

  const themeOptions: ThemeOptions = {
    palette: {
      mode,
      primary: {
        main: admin.primary,
        light: admin.primaryLight,
        dark: admin.primaryDark,
        contrastText: common.white,
      },
      secondary: {
        main: admin.secondary,
        light: admin.secondaryLight,
        dark: admin.secondaryDark,
        contrastText: common.white,
      },
      background: {
        default: backgroundDefault,
        paper: surface,
      },
      text: {
        primary: textPrimary,
        secondary: textSecondary,
      },
      success: { main: admin.success },
      warning: { main: admin.warning },
      error: { main: admin.error },
      info: { main: admin.info },
      divider: border,
      action: {
        hover: alpha(admin.primary, isDark ? 0.12 : 0.055),
        selected: alpha(admin.primary, isDark ? 0.18 : 0.1),
        focus: alpha(admin.primary, 0.16),
      },
    },
    typography: baseTypography,
    shape: {
      borderRadius: 12,
    },
    shadows: [
      'none',
      '0 1px 2px rgba(16, 35, 63, 0.04)',
      '0 2px 8px rgba(16, 35, 63, 0.06)',
      '0 4px 14px rgba(16, 35, 63, 0.08)',
      '0 8px 22px rgba(16, 35, 63, 0.09)',
      '0 10px 28px rgba(16, 35, 63, 0.10)',
      '0 12px 32px rgba(16, 35, 63, 0.11)',
      '0 14px 36px rgba(16, 35, 63, 0.12)',
      '0 16px 40px rgba(16, 35, 63, 0.13)',
      '0 18px 44px rgba(16, 35, 63, 0.14)',
      '0 20px 48px rgba(16, 35, 63, 0.15)',
      '0 22px 52px rgba(16, 35, 63, 0.16)',
      '0 24px 56px rgba(16, 35, 63, 0.17)',
      '0 26px 60px rgba(16, 35, 63, 0.18)',
      '0 28px 64px rgba(16, 35, 63, 0.19)',
      '0 30px 68px rgba(16, 35, 63, 0.20)',
      '0 32px 72px rgba(16, 35, 63, 0.21)',
      '0 34px 76px rgba(16, 35, 63, 0.22)',
      '0 36px 80px rgba(16, 35, 63, 0.23)',
      '0 38px 84px rgba(16, 35, 63, 0.24)',
      '0 40px 88px rgba(16, 35, 63, 0.25)',
      '0 42px 92px rgba(16, 35, 63, 0.26)',
      '0 44px 96px rgba(16, 35, 63, 0.27)',
      '0 46px 100px rgba(16, 35, 63, 0.28)',
      '0 48px 104px rgba(16, 35, 63, 0.29)',
    ],
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: backgroundDefault,
            color: textPrimary,
          },
          '*::selection': {
            backgroundColor: alpha(admin.primary, 0.16),
          },
          ':focus-visible': {
            outline: `2px solid ${admin.primary}`,
            outlineOffset: 2,
          },
        },
      },
      MuiButton: {
        defaultProps: {
          disableElevation: true,
        },
        styleOverrides: {
          root: {
            minHeight: 38,
            borderRadius: 10,
            paddingInline: 16,
            boxShadow: 'none',
            transition: 'background-color 140ms ease, border-color 140ms ease, box-shadow 140ms ease, transform 140ms ease',
            '&:hover': {
              boxShadow: `0 4px 12px ${alpha(admin.primary, 0.14)}`,
              transform: 'translateY(-1px)',
            },
            '&:active': {
              transform: 'translateY(0)',
            },
            '&.MuiButton-contained.MuiButton-colorPrimary': {
              background: `linear-gradient(135deg, ${admin.primary} 0%, ${admin.primaryDark} 100%)`,
              '&:hover': {
                background: `linear-gradient(135deg, ${admin.primaryDark} 0%, ${admin.secondary} 100%)`,
              },
            },
          },
          outlined: {
            borderColor: border,
            backgroundColor: alpha(elevatedSurface, 0.8),
            '&:hover': {
              borderColor: alpha(admin.primary, 0.5),
              backgroundColor: alpha(admin.primary, 0.045),
            },
          },
          sizeSmall: {
            minHeight: 32,
            paddingInline: 12,
            fontSize: '0.775rem',
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            color: textSecondary,
            '&:hover': {
              backgroundColor: alpha(admin.primary, isDark ? 0.14 : 0.065),
              color: admin.primary,
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: surface,
            borderRadius: 14,
            border: `1px solid ${border}`,
            boxShadow: isDark
              ? '0 4px 18px rgba(0, 0, 0, 0.18)'
              : '0 2px 10px rgba(16, 35, 63, 0.045)',
          },
        },
      },
      MuiCardContent: {
        styleOverrides: {
          root: {
            padding: 20,
            '&:last-child': { paddingBottom: 20 },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
          rounded: {
            borderRadius: 14,
          },
        },
      },
      MuiTextField: {
        defaultProps: {
          size: 'small',
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            minHeight: 40,
            borderRadius: 10,
            backgroundColor: elevatedSurface,
            transition: 'box-shadow 140ms ease, background-color 140ms ease',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: border,
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: alpha(admin.primary, 0.5),
            },
            '&.Mui-focused': {
              boxShadow: `0 0 0 3px ${alpha(admin.primary, 0.11)}`,
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: admin.primary,
              borderWidth: 1,
            },
          },
          input: {
            paddingBlock: 10,
            fontSize: '0.85rem',
          },
        },
      },
      MuiInputLabel: {
        styleOverrides: {
          root: {
            fontSize: '0.85rem',
          },
        },
      },
      MuiSelect: {
        styleOverrides: {
          select: {
            fontSize: '0.85rem',
          },
        },
      },
      MuiTableContainer: {
        styleOverrides: {
          root: {
            borderRadius: 14,
          },
        },
      },
      MuiTable: {
        styleOverrides: {
          root: {
            borderCollapse: 'separate',
            borderSpacing: 0,
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          head: {
            fontWeight: 650,
            fontSize: '0.75rem',
            letterSpacing: '0.01em',
            color: textSecondary,
            backgroundColor: isDark ? alpha(admin.primary, 0.08) : '#f7faff',
            borderBottom: `1px solid ${border}`,
            paddingBlock: 12,
          },
          body: {
            fontSize: '0.8125rem',
            color: textPrimary,
            borderBottom: `1px solid ${alpha(border, isDark ? 0.55 : 0.75)}`,
            paddingBlock: 12,
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            '&.MuiTableRow-hover:hover': {
              backgroundColor: alpha(admin.primary, isDark ? 0.08 : 0.035),
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            height: 26,
            fontWeight: 600,
            borderRadius: 999,
            fontSize: '0.72rem',
            '&.MuiChip-filled.MuiChip-colorPrimary': {
              backgroundColor: alpha(admin.primary, 0.12),
              color: isDark ? admin.primaryLight : admin.primaryDark,
            },
          },
          outlined: {
            borderColor: border,
          },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            border: '1px solid',
            '&.MuiAlert-standard.MuiAlert-colorSuccess': {
              borderColor: alpha(admin.success, 0.18),
            },
            '&.MuiAlert-standard.MuiAlert-colorWarning': {
              borderColor: alpha(admin.warning, 0.2),
            },
            '&.MuiAlert-standard.MuiAlert-colorError': {
              borderColor: alpha(admin.error, 0.2),
            },
            '&.MuiAlert-standard.MuiAlert-colorInfo': {
              borderColor: alpha(admin.info, 0.2),
            },
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 16,
            border: `1px solid ${border}`,
            backgroundColor: elevatedSurface,
            boxShadow: isDark ? '0 22px 60px rgba(0,0,0,0.42)' : '0 22px 60px rgba(16,35,63,0.16)',
          },
        },
      },
      MuiDialogTitle: {
        styleOverrides: {
          root: {
            padding: '20px 24px 12px',
            fontSize: '1rem',
            fontWeight: 700,
          },
        },
      },
      MuiDialogContent: {
        styleOverrides: {
          root: {
            paddingInline: 24,
          },
        },
      },
      MuiDialogActions: {
        styleOverrides: {
          root: {
            padding: '16px 24px 20px',
          },
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            marginTop: 6,
            border: `1px solid ${border}`,
            borderRadius: 12,
            boxShadow: isDark ? '0 16px 42px rgba(0,0,0,0.32)' : '0 16px 42px rgba(16,35,63,0.12)',
          },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            minHeight: 38,
            borderRadius: 8,
            marginInline: 6,
            marginBlock: 2,
            fontSize: '0.825rem',
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            borderRadius: 8,
            backgroundColor: isDark ? admin.darkElevatedSurface : admin.textPrimary,
            fontSize: '0.72rem',
          },
        },
      },
      MuiTabs: {
        styleOverrides: {
          root: {
            minHeight: 40,
          },
          indicator: {
            height: 2,
            borderRadius: 999,
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            minHeight: 40,
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.8rem',
          },
        },
      },
      MuiSwitch: {
        styleOverrides: {
          switchBase: {
            '&.Mui-checked': {
              color: admin.primary,
            },
            '&.Mui-checked + .MuiSwitch-track': {
              backgroundColor: admin.primary,
            },
          },
        },
      },
      MuiCheckbox: {
        styleOverrides: {
          root: {
            borderRadius: 6,
          },
        },
      },
      MuiPaginationItem: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            fontWeight: 600,
          },
        },
      },
      MuiSkeleton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
          },
        },
      },
    },
  };

  return createTheme(themeOptions);
};
