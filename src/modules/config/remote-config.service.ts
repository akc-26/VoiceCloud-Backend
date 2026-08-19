import { Injectable } from '@nestjs/common';
import { AdminSettingsService } from '../admin/admin-settings.service';
import { AdminFeatureFlagsService } from '../admin/admin-feature-flags.service';
import { AdminVersionsService } from '../admin/admin-versions.service';
import { AppPlatform } from '../admin/entities/app-version.entity';
import { VersionCheckDto } from './dto/version-check.dto';

@Injectable()
export class RemoteConfigService {
  constructor(
    private readonly settingsService: AdminSettingsService,
    private readonly featureFlagsService: AdminFeatureFlagsService,
    private readonly versionsService: AdminVersionsService,
  ) {}

  /**
   * Retrieves public remote configuration including feature flags, maintenance mode,
   * supported capabilities, application parameters, and rollout flags.
   */
  async getPublicRemoteConfig() {
    const publicSettings =
      (await this.settingsService.getPublicSettings()) as Record<string, any>;
    const featureFlags = await this.featureFlagsService.getAllFlagsMap();

    const isMaintenance =
      publicSettings.maintenance_mode === true ||
      publicSettings.maintenance_mode === 'true';

    return {
      featureFlags,
      maintenanceMode: isMaintenance,
      supportedCapabilities: [
        'rtc_rooms',
        'live_audio',
        'gating_tickets',
        'gifts_tipping',
        'vip_subscriptions',
        'creator_economy',
        'notifications',
      ],
      applicationParameters: {
        maxRoomCapacity: Number(publicSettings.max_room_capacity || 500),
        maxSpeakerSeats: Number(publicSettings.max_speaker_seats || 12),
        coinExchangeRate: Number(publicSettings.coin_exchange_rate || 100),
        minRechargeAmount: Number(publicSettings.min_recharge_amount || 1),
        maxRechargeAmount: Number(publicSettings.max_recharge_amount || 10000),
        enableGiftEffects: publicSettings.enable_gift_effects ?? true,
        agencyCommissionPct: Number(publicSettings.agency_commission_pct || 10),
      },
      rolloutFlags: {
        creator_economy_v2: featureFlags.creator_economy_v2 ?? true,
        agora_rtc_enabled: featureFlags.agora_rtc_enabled ?? true,
        scheduled_rooms_v1: true,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Performs client version check comparing current version with latest and min supported versions.
   */
  async checkVersion(dto: VersionCheckDto) {
    const platform = dto.platform || AppPlatform.ANDROID;
    const versionRecord =
      await this.versionsService.findLatestByPlatform(platform);

    const publicSettings =
      (await this.settingsService.getPublicSettings()) as Record<string, any>;

    const isMaintenance =
      publicSettings.maintenance_mode === true ||
      publicSettings.maintenance_mode === 'true';

    const latestVersion = versionRecord?.latestVersion || '1.2.0';
    const minSupportedVersion = versionRecord?.minSupportedVersion || '1.0.0';
    let forceUpdate = versionRecord?.forceUpdate ?? false;
    let updateAvailable = false;

    if (dto.currentVersion) {
      const cmpLatest = this.compareVersions(dto.currentVersion, latestVersion);
      const cmpMin = this.compareVersions(
        dto.currentVersion,
        minSupportedVersion,
      );

      if (cmpLatest < 0) {
        updateAvailable = true;
      }
      if (cmpMin < 0) {
        forceUpdate = true;
      }
    }

    return {
      platform,
      currentVersion: dto.currentVersion || null,
      latestVersion,
      minimumSupportedVersion: minSupportedVersion,
      minSupportedVersion,
      forceUpdate,
      updateAvailable,
      maintenanceMode: isMaintenance,
    };
  }

  private compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map((p) => parseInt(p, 10) || 0);
    const parts2 = v2.split('.').map((p) => parseInt(p, 10) || 0);
    const len = Math.max(parts1.length, parts2.length);

    for (let i = 0; i < len; i++) {
      const p1 = parts1[i] || 0;
      const p2 = parts2[i] || 0;
      if (p1 > p2) return 1;
      if (p1 < p2) return -1;
    }
    return 0;
  }
}
