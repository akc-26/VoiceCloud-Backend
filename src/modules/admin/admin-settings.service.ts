import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  SystemSetting,
  SettingValueType,
} from './entities/system-setting.entity';
import { CreateSettingDto, UpdateSettingDto } from './dto/setting.dto';
import { RedisService } from '../../redis/redis.service';
import { EventsGateway } from '../../common/events/events.gateway';
import { AdminAuditLogsService } from './admin-audit-logs.service';

const SETTINGS_ALL_CACHE = 'cache:system_settings:all';
const SETTINGS_PUBLIC_CACHE = 'cache:system_settings:public';

const DEFAULT_SYSTEM_SETTINGS = [
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
    key: 'max_room_capacity',
    group: 'rtc',
    title: 'Max Room Capacity',
    description: 'Max audience participants per room',
    value: '500',
    valueType: SettingValueType.NUMBER,
    defaultValue: '500',
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

  // Maintenance
  {
    key: 'maintenance_mode',
    group: 'maintenance',
    title: 'Maintenance Mode',
    description: 'Enable system maintenance lock',
    value: 'false',
    valueType: SettingValueType.BOOLEAN,
    defaultValue: 'false',
    isEditable: true,
    isPublic: true,
  },
  {
    key: 'maintenance_message',
    group: 'maintenance',
    title: 'Maintenance Message',
    description: 'Message displayed during maintenance',
    value:
      'System is undergoing scheduled maintenance. Please try again shortly.',
    valueType: SettingValueType.STRING,
    defaultValue: 'System is undergoing scheduled maintenance.',
    isEditable: true,
    isPublic: true,
  },
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
          existing.isPublic !== item.isPublic
        ) {
          existing.title = item.title;
          existing.group = item.group;
          existing.description = item.description;
          existing.valueType = item.valueType;
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
        return JSON.parse(cached) as Record<string, unknown>;
      } catch {
        // Fallthrough
      }
    }

    const publicSettings = await this.settingRepo.find({
      where: { isPublic: true },
    });
    const result: Record<string, unknown> = {};
    for (const s of publicSettings) {
      result[s.key] = this.parseSettingValue(s.value, s.valueType);
    }

    await this.redisService.set(
      SETTINGS_PUBLIC_CACHE,
      JSON.stringify(result),
      3600,
    );
    return result;
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

  async create(dto: CreateSettingDto, userId?: string): Promise<SystemSetting> {
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
