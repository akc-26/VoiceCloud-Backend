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
      fullName: `${BRAND_NAME} Live Voice Community`,
      documentTitle: `${BRAND_NAME} - Real Voices. Real Connections.`,
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
    adminFontFamily:
      'Inter, "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    creatorFontFamily:
      'Inter, "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    websiteDisplayFontFamily:
      'Iowan Old Style, Baskerville, Georgia, "Times New Roman", serif',
  },
  presentation: {
    website: {
      gradients: {
        primary: 'linear-gradient(135deg, #536DFE 0%, #8B5CF6 100%)',
        hero: 'linear-gradient(120deg, #F8FAFF 0%, #EEF2FF 48%, #F5ECFF 100%)',
        aura: 'radial-gradient(circle at 50% 50%, rgba(139,92,246,.22), rgba(83,109,254,.08) 42%, transparent 72%)',
      },
      radii: {
        sm: '12px',
        md: '18px',
        lg: '24px',
        xl: '30px',
        pill: '999px',
      },
      shadows: {
        soft: '0 10px 34px rgba(44, 57, 128, 0.08)',
        card: '0 16px 46px rgba(44, 57, 128, 0.10)',
        floating: '0 22px 70px rgba(44, 57, 128, 0.14)',
      },
      layout: {
        maxWidth: '1680px',
        headerHeight: '76px',
        pagePadding: 'clamp(18px, 3vw, 48px)',
      },
    },
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
      primary: '#2563eb',
      primaryLight: '#60a5fa',
      primaryDark: '#1d4ed8',
      secondary: '#0f4c81',
      secondaryLight: '#38bdf8',
      secondaryDark: '#0b3b66',
      accent: '#38bdf8',
      success: '#16a34a',
      warning: '#d97706',
      error: '#dc2626',
      info: '#0284c7',
      lightBackground: '#f4f8fc',
      lightSurface: '#ffffff',
      elevatedSurface: '#ffffff',
      navigationBackground: '#0f5ea8',
      navigationSelected: '#dcebff',
      textPrimary: '#10233f',
      textSecondary: '#64748b',
      border: '#dce5ef',
      darkBackground: '#0b1424',
      darkSurface: '#12233a',
      darkElevatedSurface: '#182c46',
      darkBorder: '#2a4564',
      darkTextPrimary: '#f3f7fb',
      darkTextSecondary: '#a9b8ca',
    },
    creator: {
      primary: '#22c55e',
      primaryLight: '#4ade80',
      primaryDark: '#15803d',
      secondary: '#0f766e',
      secondaryLight: '#2dd4bf',
      secondaryDark: '#115e59',
      accent: '#5eead4',
      accentDark: '#0f766e',
      accentLight: '#99f6e4',
      success: '#16a34a',
      warning: '#d97706',
      error: '#dc2626',
      info: '#0ea5a4',
      lightBackground: '#e7eceb',
      lightSurface: '#f3f7f5',
      elevatedSurface: '#ffffff',
      navigationBackground: '#123a32',
      navigationSelected: '#d7f4e6',
      textPrimary: '#10231f',
      textSecondary: '#64756f',
      border: '#d8e3de',
      darkBackground: '#0b1512',
      darkSurface: '#12211c',
      darkElevatedSurface: '#192b24',
      darkBorder: '#2b453b',
      darkTextPrimary: '#f3faf6',
      darkTextSecondary: '#a7bbb2',
    },
    website: {
      // Royal Sapphire consumer-web authority. Keep website presentation here;
      // compatibility-sensitive identifiers remain intentionally separate.
      primary: '#536DFE',
      primaryLight: '#F4F6FF',
      primarySoft: '#E8ECFF',
      primaryDark: '#3554E8',
      secondary: '#8B5CF6',
      secondaryDark: '#6D3FD8',
      indigo: '#6875F5',
      lavender: '#F3EDFF',
      lavenderStrong: '#E5D9FF',
      sky: '#EAF4FF',
      cloud: '#F8FAFF',
      surface: '#FFFFFF',
      surfaceSoft: '#F9FAFF',
      ink: '#121D48',
      text: '#34406B',
      textMuted: '#7B86AB',
      border: '#E0E5F5',
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
