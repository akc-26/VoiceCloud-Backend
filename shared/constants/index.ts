/**
 * Shared Platform Constants
 * Module: @shared/constants
 */

export const PLATFORM_CONSTANTS = {
  API_VERSION: 'v1',
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  TOKEN_EXPIRY_DEFAULT: '1d',
  REFRESH_TOKEN_EXPIRY_DEFAULT: '7d',
  MAX_FILE_SIZE_BYTES: 25 * 1024 * 1024, // 25 MB
} as const;

export const APP_NAMES = {
  BACKEND: 'VoiceCloud-Backend',
  ADMIN_PORTAL: 'VoiceCloud Admin Console',
  CREATOR_STUDIO: 'VoiceCloud Creator Studio',
  LANDING_WEBSITE: 'VoiceCloud Landing Website',
} as const;

export const HTTP_HEADERS = {
  REQUEST_ID: 'x-request-id',
  PLATFORM_CLIENT: 'x-platform-client',
  AUTHORIZATION: 'authorization',
} as const;
