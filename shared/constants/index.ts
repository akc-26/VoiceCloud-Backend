/**
 * Shared Platform Constants
 * Module: @shared/constants
 */

import { BRAND_CONFIG } from '../branding';

export const PLATFORM_CONSTANTS = {
  API_VERSION: 'v1',
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  TOKEN_EXPIRY_DEFAULT: '1d',
  REFRESH_TOKEN_EXPIRY_DEFAULT: '7d',
  MAX_FILE_SIZE_BYTES: 25 * 1024 * 1024, // 25 MB
} as const;

export const APP_NAMES = {
  BACKEND: BRAND_CONFIG.products.backend.name,
  ADMIN_PORTAL: BRAND_CONFIG.products.admin.fullName,
  CREATOR_STUDIO: BRAND_CONFIG.products.creator.fullName,
  LANDING_WEBSITE: BRAND_CONFIG.products.website.fullName,
} as const;

export const HTTP_HEADERS = {
  REQUEST_ID: 'x-request-id',
  PLATFORM_CLIENT: 'x-platform-client',
  AUTHORIZATION: 'authorization',
} as const;
