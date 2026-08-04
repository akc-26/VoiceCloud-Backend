import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  SystemSetting,
  SettingValueType,
} from './entities/system-setting.entity';
import { CreateSettingDto, UpdateSettingDto } from './dto/setting.dto';
import {
  HostBusinessSettingsResponseDto,
  UpdateHostBusinessSettingsDto,
} from './dto/host-business-settings.dto';
import { RedisService } from '../../redis/redis.service';
import { EventsGateway } from '../../common/events/events.gateway';
import { AdminAuditLogsService } from './admin-audit-logs.service';
import { validateHostLevelDefinitions } from '../hosts/host-level-config.validator';
import {
  OperationalSettingsResponseDto,
  UpdateOperationalSettingsDto,
} from './dto/operational-settings.dto';
import {
  StreamingInfrastructureSettingsResponseDto,
  UpdateStreamingInfrastructureSettingsDto,
} from './dto/streaming-infrastructure-settings.dto';
import {
  findManagedSettingDefinition,
  MANAGED_SETTING_KEYS,
  MAX_ROOM_CAPACITY_LIMIT,
  MAX_SPEAKER_SEATS_LIMIT,
  OPERATIONAL_SETTING_DEFINITIONS,
  OPERATIONAL_SETTING_KEYS,
  STREAMING_CODECS,
  STREAMING_INFRASTRUCTURE_SETTING_DEFINITIONS,
  STREAMING_PROVIDERS,
  STREAMING_REGIONS,
  STREAMING_INFRASTRUCTURE_SETTING_KEYS,
  STREAM_KEY_POLICIES,
  SystemSettingDefinition,
} from './system-settings/system-settings.registry';

const SETTINGS_ALL_CACHE = 'cache:system_settings:all';
const SETTINGS_PUBLIC_CACHE = 'cache:system_settings:public';

export const HOST_BUSINESS_SETTING_KEYS = [
  'host_applications_enabled',
  'min_host_followers',
  'min_host_completed_rooms',
  'require_host_good_standing',
  'host_level_definitions',
] as const;

const MANAGED_SETTING_KEY_SET = new Set<string>([
  ...MANAGED_SETTING_KEYS,
  ...HOST_BUSINESS_SETTING_KEYS,
]);

const DEFAULT_SYSTEM_SETTINGS: SystemSettingDefinition[] = [
  // General
  {
    key: 'app_name',
    group: 'general',
    title: 'Application Name',
    description: 'Public platform display name',
    value: 'VoiceCloud',
    valueType: SettingValueType.STRING,
    defaultValue: 'VoiceCloud',
    isEditable: true,
    isPublic: true,
  },
  {
    key: 'app_slogan',
    group: 'general',
    title: 'App Slogan',
    description: 'Platform tagline',
    value: 'Voice Rooms & Live Audio Platform',
    valueType: SettingValueType.STRING,
    defaultValue: 'Voice Rooms & Live Audio Platform',
    isEditable: true,
    isPublic: true,
  },
  {
    key: 'support_email',
    group: 'general',
    title: 'Support Email',
    description: 'Customer support email',
    value: 'support@voicecloud.app',
    valueType: SettingValueType.STRING,
    defaultValue: 'support@voicecloud.app',
    isEditable: true,
    isPublic: true,
  },

  // Authentication
  {
    key: 'jwt_expiration',
    group: 'authentication',
    title: 'JWT Access Token Expiration',
    description: 'Access token expiration in seconds',
    value: '3600',
    valueType: SettingValueType.NUMBER,
    defaultValue: '3600',
    isEditable: true,
    isPublic: false,
  },
  {
    key: 'jwt_refresh_expiration',
    group: 'authentication',
    title: 'JWT Refresh Token Expiration',
    description: 'Refresh token expiration in seconds',
    value: '604800',
    valueType: SettingValueType.NUMBER,
    defaultValue: '604800',
    isEditable: true,
    isPublic: false,
  },
  {
    key: 'allow_guest_login',
    group: 'authentication',
    title: 'Allow Guest Login',
    description: 'Allow guest user access',
    value: 'true',
    valueType: SettingValueType.BOOLEAN,
    defaultValue: 'true',
    isEditable: true,
    isPublic: true,
  },
  {
    key: 'allow_google_login',
    group: 'authentication',
    title: 'Allow Google Login',
    description: 'Enable Google OAuth / Sign-In access',
    value: 'true',
    valueType: SettingValueType.BOOLEAN,
    defaultValue: 'true',
    isEditable: true,
    isPublic: true,
  },
  {
    key: 'allow_phone_login',
    group: 'authentication',
    title: 'Allow Phone Login',
    description: 'Enable Phone OTP & SMS authentication',
    value: 'true',
    valueType: SettingValueType.BOOLEAN,
    defaultValue: 'true',
    isEditable: true,
    isPublic: true,
  },
  {
    key: 'require_referral_code',
    group: 'authentication',
    title: 'Require Referral Code',
    description: 'Mandate valid referral code during signup',
    value: 'false',
    valueType: SettingValueType.BOOLEAN,
    defaultValue: 'false',
    isEditable: true,
    isPublic: true,
  },
  {
    key: 'max_devices_per_user',
    group: 'authentication',
    title: 'Max Concurrent Devices per User',
    description: 'Maximum active devices and sessions allowed simultaneously',
    value: '5',
    valueType: SettingValueType.NUMBER,
    defaultValue: '5',
    isEditable: true,
    isPublic: true,
  },
  {
    key: 'otp_timeout',
    group: 'authentication',
    title: 'OTP Timeout',
    description: 'Phone OTP expiration timeout in seconds',
    value: '300',
    valueType: SettingValueType.NUMBER,
    defaultValue: '300',
    isEditable: true,
    isPublic: false,
  },
  {
    key: 'otp_retry_count',
    group: 'authentication',
    title: 'OTP Max Retry Count',
    description: 'Maximum allowed OTP verification failures before expiry',
    value: '3',
    valueType: SettingValueType.NUMBER,
    defaultValue: '3',
    isEditable: true,
    isPublic: false,
  },
  {
    key: 'failed_login_lockout_attempts',
    group: 'authentication',
    title: 'Failed Login Lockout Attempts',
    description: 'Failed login attempts allowed before account lockout',
    value: '5',
    valueType: SettingValueType.NUMBER,
    defaultValue: '5',
    isEditable: true,
    isPublic: false,
  },
  {
    key: 'failed_login_lockout_duration',
    group: 'authentication',
    title: 'Failed Login Lockout Duration',
    description: 'Lockout duration in minutes after threshold reached',
    value: '15',
    valueType: SettingValueType.NUMBER,
    defaultValue: '15',
    isEditable: true,
    isPublic: false,
  },

  // Wallet
  {
    key: 'coin_exchange_rate',
    group: 'wallet',
    title: 'Coin Exchange Rate',
    description: 'Rate of 1 USD to Coins',
    value: '100',
    valueType: SettingValueType.NUMBER,
    defaultValue: '100',
    isEditable: true,
    isPublic: true,
  },
  {
    key: 'min_recharge_amount',
    group: 'wallet',
    title: 'Min Recharge Amount',
    description: 'Min recharge amount in USD',
    value: '1',
    valueType: SettingValueType.NUMBER,
    defaultValue: '1',
    isEditable: true,
    isPublic: true,
  },
  {
    key: 'max_recharge_amount',
    group: 'wallet',
    title: 'Max Recharge Amount',
    description: 'Max recharge amount in USD',
    value: '10000',
    valueType: SettingValueType.NUMBER,
    defaultValue: '10000',
    isEditable: true,
    isPublic: true,
  },

  // Gifts
  {
    key: 'enable_gift_effects',
    group: 'gifts',
    title: 'Enable Gift Effects',
    description: 'Enable SVGA/MP4 gift animation effects',
    value: 'true',
    valueType: SettingValueType.BOOLEAN,
    defaultValue: 'true',
    isEditable: true,
    isPublic: true,
  },
  {
    key: 'max_batch_gift_quantity',
    group: 'gifts',
    title: 'Max Batch Gift Quantity',
    description: 'Maximum gift combo batch size',
    value: '999',
    valueType: SettingValueType.NUMBER,
    defaultValue: '999',
    isEditable: true,
    isPublic: true,
  },

  // VIP
  {
    key: 'vip_daily_login_bonus',
    group: 'vip',
    title: 'VIP Daily Bonus',
    description: 'Daily bonus coins for VIP members',
    value: '50',
    valueType: SettingValueType.NUMBER,
    defaultValue: '50',
    isEditable: true,
    isPublic: true,
  },

  // Host & Agency
  {
    key: 'host_applications_enabled',
    group: 'host',
    title: 'Enable Host Applications',
    description: 'Allow eligible users to submit Host applications',
    value: 'true',
    valueType: SettingValueType.BOOLEAN,
    defaultValue: 'true',
    isEditable: true,
    isPublic: true,
  },
  {
    key: 'min_host_followers',
    group: 'host',
    title: 'Min Followers for Host',
    description: 'Required follower count to apply as host',
    value: '50',
    valueType: SettingValueType.NUMBER,
    defaultValue: '50',
    validationRules: { min: 0, max: 1000000 },
    isEditable: true,
    isPublic: true,
  },
  {
    key: 'min_host_completed_rooms',
    group: 'host',
    title: 'Min Completed Rooms for Host',
    description: 'Required completed voice rooms before applying as Host',
    value: '3',
    valueType: SettingValueType.NUMBER,
    defaultValue: '3',
    validationRules: { min: 0, max: 1000000 },
    isEditable: true,
    isPublic: true,
  },
  {
    key: 'require_host_good_standing',
    group: 'host',
    title: 'Require Host Good Standing',
    description:
      'Require applicants to have no active account ban or suspension',
    value: 'true',
    valueType: SettingValueType.BOOLEAN,
    defaultValue: 'true',
    isEditable: true,
    isPublic: true,
  },
  {
    key: 'host_level_definitions',
    group: 'host',
    title: 'Host Level Definitions',
    description:
      'JSON configuration for Host XP thresholds, level names and benefits',
    value: JSON.stringify([
      {
        level: 1,
        name: 'Starter Host',
        minimumXp: 0,
        benefits: [
          { key: 'host_badge', label: 'Host badge and standard room tools' },
        ],
      },
      {
        level: 2,
        name: 'Rising Host',
        minimumXp: 1000,
        benefits: [
          {
            key: 'priority_discovery',
            label: 'Priority placement in Host discovery',
          },
        ],
      },
      {
        level: 3,
        name: 'Established Host',
        minimumXp: 5000,
        benefits: [
          { key: 'enhanced_analytics', label: 'Enhanced Host analytics' },
        ],
      },
      {
        level: 4,
        name: 'Elite Host',
        minimumXp: 15000,
        benefits: [
          {
            key: 'featured_eligibility',
            label: 'Eligibility for featured placement',
          },
        ],
      },
      {
        level: 5,
        name: 'Premier Host',
        minimumXp: 50000,
        benefits: [
          {
            key: 'premier_support',
            label: 'Premier Host support benefits',
          },
        ],
      },
    ]),
    valueType: SettingValueType.JSON,
    defaultValue: '[]',
    isEditable: true,
    isPublic: true,
  },
  {
    key: 'agency_commission_pct',
    group: 'agency',
    title: 'Agency Commission %',
    description: 'Default agency revenue share percentage',
    value: '10',
    valueType: SettingValueType.NUMBER,
    defaultValue: '10',
    isEditable: true,
    isPublic: false,
  },

  // RTC
  {
    key: 'default_rtc_provider',
    group: 'rtc',
    title: 'Default RTC Provider',
    description: 'Active voice engine provider',
    value: 'agora',
    valueType: SettingValueType.STRING,
    defaultValue: 'agora',
    isEditable: true,
    isPublic: true,
  },
  {
    key: 'default_audio_profile',
    group: 'rtc',
    title: 'Default Audio Profile',
    description: 'Room audio quality profile',
    value: 'music_standard',
    valueType: SettingValueType.STRING,
    defaultValue: 'music_standard',
    isEditable: true,
    isPublic: true,
  },

  ...OPERATIONAL_SETTING_DEFINITIONS,
  ...STREAMING_INFRASTRUCTURE_SETTING_DEFINITIONS,
];

@Injectable()
export class AdminSettingsService implements OnModuleInit {
  private readonly logger = new Logger(AdminSettingsService.name);

  constructor(
    @InjectRepository(SystemSetting)
    private readonly settingRepo: Repository<SystemSetting>,
    private readonly redisService: RedisService,
    private readonly eventsGateway: EventsGateway,
    private readonly auditLogsService: AdminAuditLogsService,
  ) {}

  async onModuleInit() {
    await this.seedDefaultSettings();
  }

  private async seedDefaultSettings() {
    for (const item of DEFAULT_SYSTEM_SETTINGS) {
      const existing = await this.settingRepo.findOne({
        where: { key: item.key },
      });
      if (existing) {
        let updated = false;
        if (
          existing.title !== item.title ||
          existing.group !== item.group ||
          existing.description !== item.description ||
          existing.valueType !== item.valueType ||
          existing.defaultValue !== item.defaultValue ||
          existing.isEditable !== item.isEditable ||
          existing.isPublic !== item.isPublic ||
          JSON.stringify(existing.validationRules ?? null) !==
            JSON.stringify(item.validationRules ?? null)
        ) {
          existing.title = item.title;
          existing.group = item.group;
          existing.description = item.description;
          existing.valueType = item.valueType;
          existing.defaultValue = item.defaultValue;
          existing.validationRules = item.validationRules;
          existing.isEditable = item.isEditable;
          existing.isPublic = item.isPublic;
          updated = true;
        }
        if (updated) {
          await this.settingRepo.save(existing);
        }
      } else {
        const setting = this.settingRepo.create(item);
        await this.settingRepo.save(setting);
        this.logger.log(`[Seed] Created system setting: ${item.key}`);
      }
    }
  }

  async findAll(): Promise<SystemSetting[]> {
    return this.settingRepo.find({ order: { group: 'ASC', key: 'ASC' } });
  }

  async findByGroup(group: string): Promise<SystemSetting[]> {
    return this.settingRepo.find({ where: { group }, order: { key: 'ASC' } });
  }

  async findByKey(key: string): Promise<SystemSetting | null> {
    return this.settingRepo.findOne({ where: { key } });
  }

  async getPublicSettings(): Promise<Record<string, unknown>> {
    const cached = await this.redisService.get(SETTINGS_PUBLIC_CACHE);
    if (cached) {
      try {
        return this.excludePrivateSettings(
          JSON.parse(cached) as Record<string, unknown>,
        );
      } catch {
        // Fall through to the database.
      }
    }

    const publicSettings = await this.settingRepo.find({
      where: { isPublic: true },
    });
    const result: Record<string, unknown> = {};
    for (const setting of publicSettings) {
      result[setting.key] = this.parseSettingValue(
        setting.value,
        setting.valueType,
      );
    }
    const safeResult = this.excludePrivateSettings(result);

    await this.redisService.set(
      SETTINGS_PUBLIC_CACHE,
      JSON.stringify(safeResult),
      3600,
    );
    return safeResult;
  }

  private excludePrivateSettings(
    settings: Record<string, unknown>,
  ): Record<string, unknown> {
    const safeSettings = { ...settings };
    for (const key of STREAMING_INFRASTRUCTURE_SETTING_KEYS) {
      delete safeSettings[key];
    }
    return safeSettings;
  }

  private parseSettingValue(
    value: string,
    valueType: SettingValueType,
  ): string | number | boolean | Record<string, unknown> {
    if (valueType === SettingValueType.BOOLEAN) return value === 'true';
    if (valueType === SettingValueType.NUMBER) return Number(value);
    if (valueType === SettingValueType.JSON) {
      try {
        return JSON.parse(value) as Record<string, unknown>;
      } catch {
        return value;
      }
    }
    return value;
  }

  async getHostBusinessSettings(): Promise<HostBusinessSettingsResponseDto> {
    const settings = await this.settingRepo.find({
      where: { key: In([...HOST_BUSINESS_SETTING_KEYS]) },
    });
    return this.parseHostBusinessSettings(settings);
  }

  async updateHostBusinessSettings(
    dto: UpdateHostBusinessSettingsDto,
    userId?: string,
  ): Promise<HostBusinessSettingsResponseDto> {
    let levels: ReturnType<typeof validateHostLevelDefinitions>;
    try {
      levels = validateHostLevelDefinitions(dto.levels);
    } catch (error) {
      throw new BadRequestException(
        `Invalid Host level configuration: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    const transactionResult = await this.settingRepo.manager.transaction(
      async (manager) => {
        const repository = manager.getRepository(SystemSetting);
        const settings = await repository.find({
          where: { key: In([...HOST_BUSINESS_SETTING_KEYS]) },
        });
        const previousValue = Object.fromEntries(
          settings.map((setting) => [setting.key, setting.value]),
        );
        const settingsByKey = new Map(
          settings.map((setting) => [setting.key, setting]),
        );

        for (const key of HOST_BUSINESS_SETTING_KEYS) {
          if (!settingsByKey.has(key)) {
            const defaultSetting = DEFAULT_SYSTEM_SETTINGS.find(
              (setting) => setting.key === key,
            );
            if (!defaultSetting) {
              throw new ServiceUnavailableException(
                `Required Host business setting '${key}' is unavailable`,
              );
            }
            settingsByKey.set(key, repository.create(defaultSetting));
          }
        }

        const applicationsEnabled = this.requireHostBusinessSetting(
          settingsByKey,
          'host_applications_enabled',
        );
        const minFollowers = this.requireHostBusinessSetting(
          settingsByKey,
          'min_host_followers',
        );
        const minCompletedRooms = this.requireHostBusinessSetting(
          settingsByKey,
          'min_host_completed_rooms',
        );
        const requireGoodStanding = this.requireHostBusinessSetting(
          settingsByKey,
          'require_host_good_standing',
        );
        const levelDefinitions = this.requireHostBusinessSetting(
          settingsByKey,
          'host_level_definitions',
        );

        applicationsEnabled.value = String(dto.applicationsEnabled);
        minFollowers.value = String(dto.minFollowers);
        minCompletedRooms.value = String(dto.minCompletedRooms);
        requireGoodStanding.value = String(dto.requireGoodStanding);
        levelDefinitions.value = JSON.stringify(levels);

        const updatedSettings = await repository.save([
          applicationsEnabled,
          minFollowers,
          minCompletedRooms,
          requireGoodStanding,
          levelDefinitions,
        ]);

        return { previousValue, updatedSettings };
      },
    );

    await this.invalidateCache();
    this.eventsGateway.broadcastSystemConfigEvent(
      'host_business_settings_updated',
      {
        keys: [...HOST_BUSINESS_SETTING_KEYS],
      },
    );

    const result = this.parseHostBusinessSettings(
      transactionResult.updatedSettings,
    );
    await this.auditLogsService.log({
      userId,
      module: 'host_business_settings',
      action: 'update',
      previousValue: transactionResult.previousValue,
      newValue: result,
    });

    return result;
  }

  private requireHostBusinessSetting(
    settings: Map<string, SystemSetting>,
    key: (typeof HOST_BUSINESS_SETTING_KEYS)[number],
  ): SystemSetting {
    const setting = settings.get(key);
    if (!setting) {
      throw new ServiceUnavailableException(
        `Required Host business setting '${key}' is unavailable`,
      );
    }
    return setting;
  }

  private parseHostBusinessSettings(
    settings: SystemSetting[],
  ): HostBusinessSettingsResponseDto {
    const settingsByKey = new Map<string, SystemSetting>(
      settings.map((setting) => [setting.key, setting]),
    );
    const applicationsEnabled = this.strictBooleanValue(
      settingsByKey.get('host_applications_enabled')?.value,
      true,
    );
    const minFollowers = this.strictNonNegativeIntegerValue(
      settingsByKey.get('min_host_followers')?.value,
      50,
    );
    const minCompletedRooms = this.strictNonNegativeIntegerValue(
      settingsByKey.get('min_host_completed_rooms')?.value,
      3,
    );
    const requireGoodStanding = this.strictBooleanValue(
      settingsByKey.get('require_host_good_standing')?.value,
      true,
    );
    const levelSetting = settingsByKey.get('host_level_definitions');
    let levels: ReturnType<typeof validateHostLevelDefinitions>;
    try {
      const defaultLevels = DEFAULT_SYSTEM_SETTINGS.find(
        (setting) => setting.key === 'host_level_definitions',
      )?.value;
      levels = validateHostLevelDefinitions(
        JSON.parse(levelSetting?.value ?? defaultLevels ?? '[]'),
      );
    } catch (error) {
      throw new ServiceUnavailableException(
        `Host business settings are invalid: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    const latestTimestamp = settings.reduce(
      (latest, setting) =>
        setting.updatedAt && setting.updatedAt.getTime() > latest.getTime()
          ? setting.updatedAt
          : latest,
      new Date(0),
    );

    return {
      applicationsEnabled,
      minFollowers,
      minCompletedRooms,
      requireGoodStanding,
      levels,
      updatedAt:
        latestTimestamp.getTime() > 0
          ? latestTimestamp.toISOString()
          : new Date().toISOString(),
    };
  }

  private strictBooleanValue(
    value: string | undefined,
    fallback: boolean,
  ): boolean {
    if (value === undefined) return fallback;
    if (value === 'true') return true;
    if (value === 'false') return false;
    throw new ServiceUnavailableException(
      'Host business settings contain an invalid boolean value',
    );
  }

  private strictNonNegativeIntegerValue(
    value: string | undefined,
    fallback: number,
  ): number {
    if (value === undefined) return fallback;
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed < 0 || parsed > 1_000_000) {
      throw new ServiceUnavailableException(
        'Host business settings contain an invalid numeric value',
      );
    }
    return parsed;
  }

  async getOperationalSettings(): Promise<OperationalSettingsResponseDto> {
    const settings = await this.settingRepo.find({
      where: { key: In([...OPERATIONAL_SETTING_KEYS]) },
    });
    return this.parseOperationalSettings(settings);
  }

  async updateOperationalSettings(
    dto: UpdateOperationalSettingsDto,
    userId?: string,
  ): Promise<OperationalSettingsResponseDto> {
    this.validateOperationalSettings(dto);
    const settings = await this.persistManagedSettings(
      [...OPERATIONAL_SETTING_KEYS],
      {
        maintenance_mode: String(dto.maintenanceMode),
        maintenance_message: dto.maintenanceMessage.trim(),
        max_room_capacity: String(dto.maxRoomCapacity),
        max_speaker_seats: String(dto.maxSpeakerSeats),
      },
    );

    await this.invalidateCache();
    this.eventsGateway.broadcastMaintenanceModeToggled({
      isMaintenance: dto.maintenanceMode,
    });
    this.eventsGateway.broadcastSystemConfigEvent(
      'operational_settings_updated',
      { keys: [...OPERATIONAL_SETTING_KEYS] },
    );

    const result = this.parseOperationalSettings(settings.updatedSettings);
    await this.auditLogsService.log({
      userId,
      module: 'operational_settings',
      action: 'update',
      previousValue: settings.previousValue,
      newValue: result,
    });
    return result;
  }

  async getStreamingInfrastructureSettings(): Promise<
    StreamingInfrastructureSettingsResponseDto
  > {
    const settings = await this.settingRepo.find({
      where: { key: In([...STREAMING_INFRASTRUCTURE_SETTING_KEYS]) },
    });
    return this.parseStreamingInfrastructureSettings(settings);
  }

  async updateStreamingInfrastructureSettings(
    dto: UpdateStreamingInfrastructureSettingsDto,
    userId?: string,
  ): Promise<StreamingInfrastructureSettingsResponseDto> {
    this.validateStreamingInfrastructureSettings(dto);
    const settings = await this.persistManagedSettings(
      [...STREAMING_INFRASTRUCTURE_SETTING_KEYS],
      {
        streaming_provider: dto.provider,
        rtmp_server_url: dto.rtmpUrl.trim(),
        webrtc_server_url: dto.webrtcUrl.trim(),
        turn_stun_servers: JSON.stringify(
          dto.turnStunServers.map((server) => server.trim()),
        ),
        recording_enabled: String(dto.recordingEnabled),
        low_latency_mode: String(dto.lowLatencyMode),
        default_bitrate: String(dto.defaultBitrate),
        codec: dto.codec,
        region: dto.region,
        stream_key_policy: dto.streamKeyPolicy,
      },
    );

    await this.invalidateCache();
    this.eventsGateway.broadcastSystemConfigEvent(
      'streaming_infrastructure_settings_updated',
      { keys: [...STREAMING_INFRASTRUCTURE_SETTING_KEYS] },
    );

    const result = this.parseStreamingInfrastructureSettings(
      settings.updatedSettings,
    );
    await this.auditLogsService.log({
      userId,
      module: 'streaming_infrastructure_settings',
      action: 'update',
      previousValue: settings.previousValue,
      newValue: result,
    });
    return result;
  }

  private validateOperationalSettings(dto: UpdateOperationalSettingsDto) {
    if (typeof dto.maintenanceMode !== 'boolean') {
      throw new BadRequestException('Maintenance mode must be a boolean');
    }
    if (
      typeof dto.maintenanceMessage !== 'string' ||
      dto.maintenanceMessage.trim().length < 1 ||
      dto.maintenanceMessage.trim().length > 500
    ) {
      throw new BadRequestException(
        'Maintenance message must contain between 1 and 500 characters',
      );
    }
    if (
      !Number.isSafeInteger(dto.maxRoomCapacity) ||
      dto.maxRoomCapacity < 2 ||
      dto.maxRoomCapacity > MAX_ROOM_CAPACITY_LIMIT
    ) {
      throw new BadRequestException(
        `Maximum room capacity must be an integer between 2 and ${MAX_ROOM_CAPACITY_LIMIT}`,
      );
    }
    if (
      !Number.isSafeInteger(dto.maxSpeakerSeats) ||
      dto.maxSpeakerSeats < 1 ||
      dto.maxSpeakerSeats > MAX_SPEAKER_SEATS_LIMIT ||
      dto.maxSpeakerSeats >= dto.maxRoomCapacity
    ) {
      throw new BadRequestException(
        'Maximum speaker seats must be between 1 and 100 and below room capacity',
      );
    }
  }

  private validateStreamingInfrastructureSettings(
    dto: UpdateStreamingInfrastructureSettingsDto,
  ) {
    const providers = new Set<string>(STREAMING_PROVIDERS);
    const codecs = new Set<string>(STREAMING_CODECS);
    const regions = new Set<string>(STREAMING_REGIONS);
    const policies = new Set<string>(STREAM_KEY_POLICIES);
    if (!providers.has(dto.provider)) {
      throw new BadRequestException('Unsupported streaming provider');
    }
    if (!/^rtmps?:\/\/[^\s]+$/i.test(dto.rtmpUrl)) {
      throw new BadRequestException('Invalid RTMP server URL');
    }
    if (!/^(?:wss?|webrtc):\/\/[^\s]+$/i.test(dto.webrtcUrl)) {
      throw new BadRequestException('Invalid WebRTC server URL');
    }
    if (
      !Array.isArray(dto.turnStunServers) ||
      dto.turnStunServers.length < 1 ||
      dto.turnStunServers.length > 20 ||
      dto.turnStunServers.some(
        (server) =>
          typeof server !== 'string' ||
          !/^(?:turns?|stuns?):[^\s]+$/i.test(server.trim()),
      )
    ) {
      throw new BadRequestException('Invalid TURN/STUN server configuration');
    }
    if (
      new Set(dto.turnStunServers.map((server) => server.trim())).size !==
      dto.turnStunServers.length
    ) {
      throw new BadRequestException('TURN/STUN servers must be unique');
    }
    if (
      typeof dto.recordingEnabled !== 'boolean' ||
      typeof dto.lowLatencyMode !== 'boolean'
    ) {
      throw new BadRequestException(
        'Streaming feature switches must be boolean values',
      );
    }
    if (
      !Number.isSafeInteger(dto.defaultBitrate) ||
      dto.defaultBitrate < 32 ||
      dto.defaultBitrate > 512
    ) {
      throw new BadRequestException(
        'Default bitrate must be an integer between 32 and 512',
      );
    }
    if (!codecs.has(dto.codec)) {
      throw new BadRequestException('Unsupported streaming codec');
    }
    if (!regions.has(dto.region)) {
      throw new BadRequestException('Unsupported streaming region');
    }
    if (!policies.has(dto.streamKeyPolicy)) {
      throw new BadRequestException('Unsupported stream-key policy');
    }
  }

  private async persistManagedSettings(
    keys: string[],
    values: Record<string, string>,
  ): Promise<{
    previousValue: Record<string, string>;
    updatedSettings: SystemSetting[];
  }> {
    return this.settingRepo.manager.transaction(async (manager) => {
      const repository = manager.getRepository(SystemSetting);
      const settings = await repository.find({ where: { key: In(keys) } });
      const previousValue = Object.fromEntries(
        settings.map((setting) => [setting.key, setting.value]),
      );
      const settingsByKey = new Map<string, SystemSetting>(
        settings.map((setting) => [setting.key, setting]),
      );

      for (const key of keys) {
        if (!settingsByKey.has(key)) {
          const definition =
            findManagedSettingDefinition(key) ||
            DEFAULT_SYSTEM_SETTINGS.find((setting) => setting.key === key);
          if (!definition) {
            throw new ServiceUnavailableException(
              `Required system setting '${key}' is unavailable`,
            );
          }
          settingsByKey.set(key, repository.create(definition));
        }
      }

      const toSave = keys.map((key) => {
        const setting = settingsByKey.get(key);
        if (!setting) {
          throw new ServiceUnavailableException(
            `Required system setting '${key}' is unavailable`,
          );
        }
        setting.value = values[key];
        return setting;
      });

      const updatedSettings = await repository.save(toSave);
      return { previousValue, updatedSettings };
    });
  }

  private parseOperationalSettings(
    settings: SystemSetting[],
  ): OperationalSettingsResponseDto {
    const settingsByKey = new Map<string, SystemSetting>(
      settings.map((setting) => [setting.key, setting]),
    );
    const result: OperationalSettingsResponseDto = {
      maintenanceMode: this.strictBooleanSetting(
        settingsByKey.get('maintenance_mode')?.value,
        'maintenance_mode',
        false,
      ),
      maintenanceMessage: this.strictStringSetting(
        settingsByKey.get('maintenance_message')?.value,
        'maintenance_message',
        'System is undergoing scheduled maintenance. Please try again shortly.',
      ),
      maxRoomCapacity: this.strictIntegerSetting(
        settingsByKey.get('max_room_capacity')?.value,
        'max_room_capacity',
        2,
        MAX_ROOM_CAPACITY_LIMIT,
        500,
      ),
      maxSpeakerSeats: this.strictIntegerSetting(
        settingsByKey.get('max_speaker_seats')?.value,
        'max_speaker_seats',
        1,
        MAX_SPEAKER_SEATS_LIMIT,
        12,
      ),
      updatedAt: this.latestSettingsTimestamp(settings),
    };
    try {
      this.validateOperationalSettings(result);
    } catch (error) {
      throw new ServiceUnavailableException(
        `Operational system settings are invalid: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
    return result;
  }

  private parseStreamingInfrastructureSettings(
    settings: SystemSetting[],
  ): StreamingInfrastructureSettingsResponseDto {
    const settingsByKey = new Map<string, SystemSetting>(
      settings.map((setting) => [setting.key, setting]),
    );
    const turnStunServers = this.strictStringArraySetting(
      settingsByKey.get('turn_stun_servers')?.value,
      'turn_stun_servers',
      ['turn:turn.voicecloud.app:3478', 'stun:stun.l.google.com:19302'],
    );
    const result: StreamingInfrastructureSettingsResponseDto = {
      provider: this.strictStringSetting(
        settingsByKey.get('streaming_provider')?.value,
        'streaming_provider',
        'mediamtx',
      ),
      rtmpUrl: this.strictStringSetting(
        settingsByKey.get('rtmp_server_url')?.value,
        'rtmp_server_url',
        'rtmps://live.voicecloud.app:443/live',
      ),
      webrtcUrl: this.strictStringSetting(
        settingsByKey.get('webrtc_server_url')?.value,
        'webrtc_server_url',
        'wss://webrtc.voicecloud.app:443/v1',
      ),
      turnStunServers,
      recordingEnabled: this.strictBooleanSetting(
        settingsByKey.get('recording_enabled')?.value,
        'recording_enabled',
        true,
      ),
      lowLatencyMode: this.strictBooleanSetting(
        settingsByKey.get('low_latency_mode')?.value,
        'low_latency_mode',
        true,
      ),
      defaultBitrate: this.strictIntegerSetting(
        settingsByKey.get('default_bitrate')?.value,
        'default_bitrate',
        32,
        512,
        324,
      ),
      codec: this.strictStringSetting(
        settingsByKey.get('codec')?.value,
        'codec',
        'opus',
      ),
      region: this.strictStringSetting(
        settingsByKey.get('region')?.value,
        'region',
        'us-east',
      ),
      streamKeyPolicy: this.strictStringSetting(
        settingsByKey.get('stream_key_policy')?.value,
        'stream_key_policy',
        'auto_rotate_90d',
      ),
      updatedAt: this.latestSettingsTimestamp(settings),
    };
    try {
      this.validateStreamingInfrastructureSettings(result);
    } catch (error) {
      throw new ServiceUnavailableException(
        `Streaming infrastructure settings are invalid: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
    return result;
  }

  private strictBooleanSetting(
    value: string | undefined,
    key: string,
    fallback: boolean,
  ): boolean {
    if (value === undefined) return fallback;
    if (value === 'true') return true;
    if (value === 'false') return false;
    throw new ServiceUnavailableException(
      `System setting '${key}' contains an invalid boolean value`,
    );
  }

  private strictStringSetting(
    value: string | undefined,
    key: string,
    fallback: string,
  ): string {
    const parsed = value ?? fallback;
    if (typeof parsed !== 'string' || parsed.trim().length === 0) {
      throw new ServiceUnavailableException(
        `System setting '${key}' contains an invalid string value`,
      );
    }
    return parsed;
  }

  private strictIntegerSetting(
    value: string | undefined,
    key: string,
    min: number,
    max: number,
    fallback: number,
  ): number {
    const parsed = value === undefined ? fallback : Number(value);
    if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
      throw new ServiceUnavailableException(
        `System setting '${key}' contains an invalid numeric value`,
      );
    }
    return parsed;
  }

  private strictStringArraySetting(
    value: string | undefined,
    key: string,
    fallback: string[],
  ): string[] {
    if (value === undefined) return fallback;
    try {
      const parsed = JSON.parse(value) as unknown;
      if (
        !Array.isArray(parsed) ||
        parsed.length < 1 ||
        parsed.some((item) => typeof item !== 'string')
      ) {
        throw new Error('Expected a non-empty string array');
      }
      return (parsed as string[]).map((item) => item.trim());
    } catch (error) {
      throw new ServiceUnavailableException(
        `System setting '${key}' contains invalid JSON: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private latestSettingsTimestamp(settings: SystemSetting[]): string {
    const latest = settings.reduce(
      (current, setting) =>
        setting.updatedAt && setting.updatedAt.getTime() > current.getTime()
          ? setting.updatedAt
          : current,
      new Date(0),
    );
    return latest.getTime() > 0
      ? latest.toISOString()
      : new Date().toISOString();
  }

  async create(dto: CreateSettingDto, userId?: string): Promise<SystemSetting> {
    if (MANAGED_SETTING_KEY_SET.has(dto.key)) {
      throw new BadRequestException(
        'Managed system settings must be changed through their dedicated atomic endpoint',
      );
    }

    const setting = this.settingRepo.create(dto);
    const saved = await this.settingRepo.save(setting);

    await this.invalidateCache();
    this.eventsGateway.broadcastSystemConfigEvent('setting_created', {
      key: saved.key,
      group: saved.group,
    });

    await this.auditLogsService.log({
      userId,
      module: 'system_settings',
      action: 'create',
      newValue: saved,
    });

    return saved;
  }

  async update(
    key: string,
    dto: UpdateSettingDto,
    userId?: string,
  ): Promise<SystemSetting> {
    if (MANAGED_SETTING_KEY_SET.has(key)) {
      throw new BadRequestException(
        'Managed system settings must be changed through their dedicated atomic endpoint',
      );
    }

    const setting = await this.findByKey(key);
    if (!setting) {
      throw new Error(`Setting with key '${key}' not found`);
    }

    const previousValue = { ...setting };
    setting.value = dto.value;
    const updated = await this.settingRepo.save(setting);

    await this.invalidateCache();

    if (key === 'maintenance_mode') {
      this.eventsGateway.broadcastMaintenanceModeToggled({
        isMaintenance: dto.value === 'true',
      });
    }
    this.eventsGateway.broadcastSystemConfigEvent('setting_updated', {
      key,
      value: dto.value,
    });

    await this.auditLogsService.log({
      userId,
      module: 'system_settings',
      action: 'update',
      previousValue: previousValue,
      newValue: updated,
    });

    return updated;
  }

  private async invalidateCache() {
    await this.redisService.del(SETTINGS_ALL_CACHE);
    await this.redisService.del(SETTINGS_PUBLIC_CACHE);
  }
}
