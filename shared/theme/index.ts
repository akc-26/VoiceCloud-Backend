/**
 * Shared UI Design System Tokens
 * Module: @shared/theme
 */

import { BRAND_CONFIG } from '../branding';

export const THEME_TOKENS = {
  colors: {
    primary: {
      50: BRAND_CONFIG.colors.website.primaryLight,
      100: BRAND_CONFIG.colors.website.primarySoft,
      500: BRAND_CONFIG.colors.website.primary,
      600: BRAND_CONFIG.colors.website.primaryDark,
      700: '#1e40af',
    },
    secondary: {
      500: BRAND_CONFIG.colors.website.secondary,
      600: BRAND_CONFIG.colors.website.secondaryDark,
    },
    neutral: {
      50: BRAND_CONFIG.colors.common.neutral50,
      100: BRAND_CONFIG.colors.common.neutral100,
      200: BRAND_CONFIG.colors.common.neutral200,
      800: BRAND_CONFIG.colors.common.neutral800,
      900: BRAND_CONFIG.colors.common.neutral900,
    },
    status: {
      success: BRAND_CONFIG.colors.common.success,
      warning: BRAND_CONFIG.colors.common.warning,
      error: BRAND_CONFIG.colors.common.error,
      info: BRAND_CONFIG.colors.common.info,
    },
  },
  typography: {
    fontFamily: BRAND_CONFIG.typography.fontFamily,
    fontSizes: {
      xs: '0.75rem',
      sm: '0.875rem',
      md: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
    },
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
  },
  borderRadius: {
    sm: '0.25rem',
    md: '0.5rem',
    lg: '0.75rem',
    full: '9999px',
  },
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
  },
} as const;
