import { BRAND_CONFIG, getBrandAssetUrl } from '@shared/branding';

/**
 * Consumer website branding adapter.
 *
 * IMPORTANT: this file contains no independent brand values. The single source
 * of truth is `shared/branding/index.ts`, matching Admin and Creator Studio.
 * Website code imports from this adapter so page/components never reach into
 * the shared structure or hard-code presentation constants directly.
 */
const colors = BRAND_CONFIG.colors.website;
const presentation = BRAND_CONFIG.presentation.website;

export const WEBSITE_BRAND = {
  identity: {
    name: BRAND_CONFIG.identity.name,
    tagline: 'Real voices. Real connections.',
    supportingTagline: BRAND_CONFIG.identity.tagline,
  },
  assets: {
    logoMark: getBrandAssetUrl('website', 'logoMark'),
    logoHorizontal: getBrandAssetUrl('website', 'logoHorizontal'),
    favicon: getBrandAssetUrl('website', 'favicon'),
    appIcon: getBrandAssetUrl('website', 'appIcon'),
  },
  colors: {
    sapphire: colors.primary,
    sapphireDeep: colors.primaryDark,
    sapphireSoft: colors.primarySoft,
    ice: colors.primaryLight,
    indigo: colors.indigo,
    violet: colors.secondary,
    violetDeep: colors.secondaryDark,
    lavender: colors.lavender,
    lavenderStrong: colors.lavenderStrong,
    sky: colors.sky,
    cloud: colors.cloud,
    surface: colors.surface,
    surfaceSoft: colors.surfaceSoft,
    ink: colors.ink,
    text: colors.text,
    textMuted: colors.textMuted,
    border: colors.border,
    success: BRAND_CONFIG.colors.common.success,
    warning: BRAND_CONFIG.colors.common.warning,
    error: BRAND_CONFIG.colors.common.error,
  },
  typography: {
    body: BRAND_CONFIG.typography.fontFamily,
    display: BRAND_CONFIG.typography.websiteDisplayFontFamily,
  },
  gradients: presentation.gradients,
  radii: presentation.radii,
  shadows: presentation.shadows,
  layout: presentation.layout,
} as const;

export type WebsiteBrand = typeof WEBSITE_BRAND;

type CssTokenMap = Record<string, string>;

export function websiteBrandCssTokens(): CssTokenMap {
  return {
    '--vc-sapphire': WEBSITE_BRAND.colors.sapphire,
    '--vc-sapphire-deep': WEBSITE_BRAND.colors.sapphireDeep,
    '--vc-sapphire-soft': WEBSITE_BRAND.colors.sapphireSoft,
    '--vc-ice': WEBSITE_BRAND.colors.ice,
    '--vc-indigo': WEBSITE_BRAND.colors.indigo,
    '--vc-violet': WEBSITE_BRAND.colors.violet,
    '--vc-violet-deep': WEBSITE_BRAND.colors.violetDeep,
    '--vc-lavender': WEBSITE_BRAND.colors.lavender,
    '--vc-lavender-strong': WEBSITE_BRAND.colors.lavenderStrong,
    '--vc-sky': WEBSITE_BRAND.colors.sky,
    '--vc-cloud': WEBSITE_BRAND.colors.cloud,
    '--vc-surface': WEBSITE_BRAND.colors.surface,
    '--vc-surface-soft': WEBSITE_BRAND.colors.surfaceSoft,
    '--vc-ink': WEBSITE_BRAND.colors.ink,
    '--vc-text': WEBSITE_BRAND.colors.text,
    '--vc-text-muted': WEBSITE_BRAND.colors.textMuted,
    '--vc-border': WEBSITE_BRAND.colors.border,
    '--vc-success': WEBSITE_BRAND.colors.success,
    '--vc-warning': WEBSITE_BRAND.colors.warning,
    '--vc-error': WEBSITE_BRAND.colors.error,
    '--vc-font-body': WEBSITE_BRAND.typography.body,
    '--vc-font-display': WEBSITE_BRAND.typography.display,
    '--vc-gradient-primary': WEBSITE_BRAND.gradients.primary,
    '--vc-gradient-hero': WEBSITE_BRAND.gradients.hero,
    '--vc-gradient-aura': WEBSITE_BRAND.gradients.aura,
    '--vc-radius-sm': WEBSITE_BRAND.radii.sm,
    '--vc-radius-md': WEBSITE_BRAND.radii.md,
    '--vc-radius-lg': WEBSITE_BRAND.radii.lg,
    '--vc-radius-xl': WEBSITE_BRAND.radii.xl,
    '--vc-radius-pill': WEBSITE_BRAND.radii.pill,
    '--vc-shadow-soft': WEBSITE_BRAND.shadows.soft,
    '--vc-shadow-card': WEBSITE_BRAND.shadows.card,
    '--vc-shadow-floating': WEBSITE_BRAND.shadows.floating,
    '--vc-layout-max': WEBSITE_BRAND.layout.maxWidth,
    '--vc-header-height': WEBSITE_BRAND.layout.headerHeight,
    '--vc-page-padding': WEBSITE_BRAND.layout.pagePadding,
  };
}

export function installWebsiteBrand(): void {
  const root = document.documentElement;
  for (const [key, value] of Object.entries(websiteBrandCssTokens())) {
    root.style.setProperty(key, value);
  }

  document.title = BRAND_CONFIG.products.website.documentTitle;

  let favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!favicon) {
    favicon = document.createElement('link');
    favicon.rel = 'icon';
    document.head.appendChild(favicon);
  }
  favicon.href = WEBSITE_BRAND.assets.favicon;
}
