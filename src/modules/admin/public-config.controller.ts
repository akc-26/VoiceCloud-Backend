import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { AdminSettingsService } from './admin-settings.service';
import { AdminFeatureFlagsService } from './admin-feature-flags.service';
import { AdminVersionsService } from './admin-versions.service';
import { AdminProvidersService } from './admin-providers.service';
import { AppPlatform } from './entities/app-version.entity';

@ApiTags('Application Configuration')
@Controller('config')
export class PublicConfigController {
  constructor(
    private readonly settingsService: AdminSettingsService,
    private readonly featureFlagsService: AdminFeatureFlagsService,
    private readonly versionsService: AdminVersionsService,
    private readonly providersService: AdminProvidersService,
  ) {}

  @Public()
  @Get('mobile')
  @ApiOperation({
    summary: 'Get complete dynamic configuration for mobile client',
  })
  @ApiQuery({ name: 'platform', enum: AppPlatform, required: false })
  @ApiResponse({
    status: 200,
    description: 'Complete mobile dynamic config payload',
  })
  async getMobileConfig(
    @Query('platform') platform: AppPlatform = AppPlatform.ANDROID,
  ) {
    const publicSettings =
      (await this.settingsService.getPublicSettings()) as Record<
        string,
        string | number | boolean
      >;
    const featureFlags = await this.featureFlagsService.getAllFlagsMap();
    const versionInfo =
      await this.versionsService.findLatestByPlatform(platform);
    const providersSummary =
      (await this.providersService.getPublicProviderSummary()) as Record<
        string,
        unknown[]
      >;

    const isMaintenance =
      publicSettings.maintenance_mode === true ||
      publicSettings.maintenance_mode === 'true';

    return {
      appVersion: versionInfo,
      maintenanceMode: isMaintenance,
      maintenanceMessage: String(
        publicSettings.maintenance_message || 'System under maintenance',
      ),
      featureFlags,
      walletSettings: {
        coinExchangeRate: Number(publicSettings.coin_exchange_rate || 100),
        minRechargeAmount: Number(publicSettings.min_recharge_amount || 1),
        maxRechargeAmount: Number(publicSettings.max_recharge_amount || 10000),
      },
      giftSettings: {
        enableGiftEffects: publicSettings.enable_gift_effects ?? true,
        maxBatchQuantity: Number(publicSettings.max_batch_gift_quantity || 999),
      },
      vipSettings: {
        dailyLoginBonus: Number(publicSettings.vip_daily_login_bonus || 50),
      },
      hostSettings: {
        applicationsEnabled:
          publicSettings.host_applications_enabled !== false &&
          publicSettings.host_applications_enabled !== 'false',
        minFollowersRequired: Number(publicSettings.min_host_followers ?? 50),
        minCompletedRoomsRequired: Number(
          publicSettings.min_host_completed_rooms ?? 3,
        ),
        requireGoodStanding:
          publicSettings.require_host_good_standing !== false &&
          publicSettings.require_host_good_standing !== 'false',
      },
      agencySettings: {
        commissionPct: Number(publicSettings.agency_commission_pct || 10),
      },
      supportedLoginMethods: [
        'phone',
        'email',
        'google',
        'facebook',
        'apple',
        'guest',
      ],
      supportedLanguages: ['en', 'hi', 'ar', 'es', 'pt', 'id', 'vi', 'zh'],
      availableRtcProviders: providersSummary.rtc || [],
      pushNotificationSettings: {
        enabled: featureFlags.enable_notifications ?? true,
      },
      mediaUploadLimits: {
        maxFileSizeMb: 50,
        allowedImageTypes: [
          'image/jpeg',
          'image/png',
          'image/webp',
          'image/gif',
        ],
        allowedAudioTypes: [
          'audio/mpeg',
          'audio/mp4',
          'audio/aac',
          'audio/wav',
        ],
      },
      maxRoomCapacity: Number(publicSettings.max_room_capacity || 500),
      supportedAudioProfiles: [
        'speech_standard',
        'music_standard',
        'music_high_quality',
      ],
      coinConfigurations: [
        { coins: 100, priceUsd: 0.99, isPopular: false },
        { coins: 550, priceUsd: 4.99, isPopular: true, bonusCoins: 50 },
        { coins: 1200, priceUsd: 9.99, isPopular: false, bonusCoins: 200 },
        { coins: 6500, priceUsd: 49.99, isPopular: false, bonusCoins: 1500 },
      ],
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get('public')
  @ApiOperation({ summary: 'Get public system settings and feature flags' })
  async getPublicConfig() {
    const [publicSettings, featureFlags] = await Promise.all([
      this.settingsService.getPublicSettings(),
      this.featureFlagsService.getAllFlagsMap(),
    ]);
    return {
      settings: publicSettings,
      featureFlags,
    };
  }

  @Public()
  @Get('version')
  @ApiOperation({ summary: 'Get application version information' })
  @ApiQuery({ name: 'platform', enum: AppPlatform, required: false })
  async getVersion(
    @Query('platform') platform: AppPlatform = AppPlatform.ANDROID,
  ) {
    const version = await this.versionsService.findLatestByPlatform(platform);
    return (
      version || {
        platform,
        latestVersion: '1.0.0',
        minSupportedVersion: '1.0.0',
        forceUpdate: false,
      }
    );
  }

  @Public()
  @Get('features')
  @ApiOperation({ summary: 'Get active feature flags map' })
  async getFeatures() {
    return this.featureFlagsService.getAllFlagsMap();
  }

  @Public()
  @Get('maintenance')
  @ApiOperation({ summary: 'Get system maintenance status' })
  async getMaintenance() {
    const publicSettings = await this.settingsService.getPublicSettings();
    const isMaintenance =
      publicSettings.maintenance_mode === true ||
      publicSettings.maintenance_mode === 'true';
    return {
      inMaintenance: isMaintenance,
      message: publicSettings.maintenance_message || 'System under maintenance',
    };
  }

  @Public()
  @Get('providers')
  @ApiOperation({
    summary: 'Get public enabled third-party provider capabilities',
  })
  async getProviders() {
    return this.providersService.getPublicProviderSummary();
  }
}
