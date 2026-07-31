/**
 * Shared Platform Configuration Defaults
 * Module: @shared/config
 */

import { AppEnvironment } from '../enums';

export interface PlatformFeatureFlags {
  enableCreatorStudio: boolean;
  enableLandingWebsite: boolean;
  enableSwaggerDocs: boolean;
  enableWebSockets: boolean;
  enableAnalytics: boolean;
}

export interface SharedPlatformConfig {
  appName: string;
  defaultPort: number;
  environment: AppEnvironment;
  apiPrefix: string;
  featureFlags: PlatformFeatureFlags;
}

export const DEFAULT_PLATFORM_CONFIG: SharedPlatformConfig = {
  appName: 'VoiceCloud',
  defaultPort: 3000,
  environment: AppEnvironment.DEVELOPMENT,
  apiPrefix: '/api/v1',
  featureFlags: {
    enableCreatorStudio: true,
    enableLandingWebsite: true,
    enableSwaggerDocs: true,
    enableWebSockets: true,
    enableAnalytics: true,
  },
};
