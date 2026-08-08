/**
 * Central white-label identity and presentation configuration.
 *
 * Change customer-facing names, brand colors and asset files here without
 * changing routes, APIs, business logic or persisted data contracts.
 */

const BRAND_NAME = 'VoiceCloud';
const BRAND_SLUG = 'voicecloud';

export const BRAND_CONFIG = {
  identity: {
    name: BRAND_NAME,
    slug: BRAND_SLUG,
    legalName: `${BRAND_NAME} Enterprise Platform`,
    tagline: 'Live audio. Real connection.',
  },
  products: {
    admin: {
      name: `${BRAND_NAME} Admin`,
      shortName: 'Admin Console',
      fullName: `${BRAND_NAME} Admin Console`,
      workspaceLabel: 'Administration Workspace',
      documentTitle: `${BRAND_NAME} Admin Console`,
    },
    creator: {
      name: `${BRAND_NAME} Creator Studio`,
      shortName: 'Creator Studio',
      fullName: `${BRAND_NAME} Creator Studio`,
      workspaceLabel: 'Creator Workspace',
      documentTitle: `${BRAND_NAME} Creator Studio`,
    },
    website: {
      name: BRAND_NAME,
      shortName: 'Live Audio Platform',
      fullName: `${BRAND_NAME} Live Audio Platform`,
      documentTitle: `${BRAND_NAME} - Live Audio & Creator Platform`,
    },
    backend: {
      name: `${BRAND_NAME} Backend`,
      apiName: `${BRAND_NAME} Monolith API`,
    },
  },
  contacts: {
    supportEmail: `support@${BRAND_SLUG}.app`,
    creatorLoginExample: `creator@${BRAND_SLUG}.com`,
  },
  defaults: {
    officialCreatorUsername: `${BRAND_SLUG}_official`,
    officialCreatorDisplayName: `${BRAND_NAME} Official Host`,
    officialCreatorHandle: `@${BRAND_SLUG}_official`,
    officialCreatorBio: `Official ${BRAND_NAME} audio creator.`,
  },
  assets: {
    logoMark: 'brand/logo-mark.svg',
    logoHorizontal: 'brand/logo-horizontal.svg',
    favicon: 'brand/favicon.svg',
    appIcon: 'brand/app-icon.svg',
  },
  typography: {
    fontFamily:
      '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  colors: {
    common: {
      white: '#ffffff',
      neutral50: '#f8fafc',
      neutral100: '#f1f5f9',
      neutral200: '#e2e8f0',
      neutral600: '#475569',
      neutral700: '#334155',
      neutral800: '#1e293b',
      neutral900: '#0f172a',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
    },
    admin: {
      primary: '#1d4ed8',
      primaryLight: '#3b82f6',
      primaryDark: '#1e40af',
      secondary: '#0284c7',
      secondaryLight: '#38bdf8',
      secondaryDark: '#0369a1',
      lightBackground: '#f8fafc',
      darkBackground: '#0b1120',
      darkSurface: '#1e293b',
    },
    creator: {
      primary: '#7c3aed',
      primaryLight: '#9333ea',
      primaryDark: '#6d28d9',
      secondary: '#2563eb',
      secondaryLight: '#3b82f6',
      secondaryDark: '#1d4ed8',
      accent: '#6366f1',
      accentDark: '#4f46e5',
      accentLight: '#a855f7',
      lightBackground: '#f8fafc',
      darkBackground: '#0f172a',
      darkSurface: '#1e293b',
    },
    website: {
      primary: '#2563eb',
      primaryLight: '#f0f6ff',
      primarySoft: '#e0edff',
      primaryDark: '#1d4ed8',
      secondary: '#7c3aed',
      secondaryDark: '#6d28d9',
    },
  },
} as const;

export type BrandSurface = 'website' | 'admin' | 'creator';
export type BrandAsset = keyof typeof BRAND_CONFIG.assets;

const SURFACE_BASE_PATHS: Record<BrandSurface, string> = {
  website: '/',
  admin: '/admin/',
  creator: '/creator/',
};

/** Returns a stable public URL for the centrally managed brand asset. */
export function getBrandAssetUrl(
  surface: BrandSurface,
  asset: BrandAsset,
): string {
  return `${SURFACE_BASE_PATHS[surface]}${BRAND_CONFIG.assets[asset]}`;
}
