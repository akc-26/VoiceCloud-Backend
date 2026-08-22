import {
  Injectable,
  Logger,
  OnModuleInit,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import {
  ProviderConfig,
  ProviderCategory,
} from './entities/provider-config.entity';
import { ProviderConfigHistory } from './entities/provider-config-history.entity';
import {
  CreateProviderConfigDto,
  UpdateProviderConfigDto,
  RotateSecretDto,
} from './dto/provider-config.dto';
import { RedisService } from '../../redis/redis.service';
import { EventsGateway } from '../../common/events/events.gateway';
import { AdminAuditLogsService } from './admin-audit-logs.service';
import { EncryptionService } from '../../common/services/encryption.service';
import { ProviderTestConnectionService } from './provider-test-connection.service';
import { RtcConfig, RtcProviderType } from '../rtc/entities/rtc-config.entity';
import { resolveLiveKitProviderConfig } from '../rtc/livekit-config.util';

const PUBLIC_PROVIDERS_CACHE = 'cache:provider_configs:public';

const DEFAULT_PROVIDERS = [
  // RTC
  {
    category: ProviderCategory.RTC,
    providerType: 'agora',
    name: 'Agora RTC Engine (Production)',
    config: {
      appId: 'AGORA_APP_ID_DEFAULT',
      appCertificate: 'AGORA_CERT_DEFAULT',
      tokenExpiration: 3600,
    },
    isEnabled: true,
    isActive: true,
    isSandbox: false,
    priority: 1,
    notes: 'Default active RTC provider for audio/video rooms',
    tags: ['rtc', 'production', 'agora'],
  },
  {
    category: ProviderCategory.RTC,
    providerType: 'livekit',
    name: 'LiveKit Cloud / Self-Hosted',
    config: {
      apiKey: 'LIVEKIT_API_KEY_DEFAULT',
      apiSecret: 'LIVEKIT_SECRET_DEFAULT',
      serverUrl: 'wss://YOUR_PROJECT.livekit.cloud',
    },
    isEnabled: true,
    isActive: false,
    isSandbox: true,
    priority: 2,
    notes: 'LiveKit open-source / cloud fallback',
    tags: ['rtc', 'livekit', 'raspberry-pi'],
  },
  {
    category: ProviderCategory.RTC,
    providerType: 'zegocloud',
    name: 'ZEGOCLOUD Express Audio',
    config: { appId: 12345678, serverSecret: 'ZEGO_SERVER_SECRET_DEFAULT' },
    isEnabled: true,
    isActive: false,
    isSandbox: true,
    priority: 3,
    notes: 'ZEGOCLOUD voice room backup provider',
    tags: ['rtc', 'zegocloud'],
  },

  // Storage
  {
    category: ProviderCategory.STORAGE,
    providerType: 'minio',
    name: 'Local MinIO S3 (Development / Pi)',
    config: {
      endpoint: 'http://localhost:9000',
      bucket: 'voicecloud-local',
      accessKeyId: 'minioadmin',
      secretAccessKey: 'minioadmin',
      region: 'us-east-1',
    },
    isEnabled: true,
    isActive: true,
    isSandbox: true,
    priority: 1,
    notes: 'Local MinIO object storage for Raspberry Pi / local dev',
    tags: ['storage', 'minio', 's3-compatible'],
  },
  {
    category: ProviderCategory.STORAGE,
    providerType: 's3',
    name: 'AWS S3 Cloud Media',
    config: {
      bucket: 'voicecloud-media-prod',
      region: 'us-east-1',
      accessKeyId: 'AWS_ACCESS_KEY_ID',
      secretAccessKey: 'AWS_SECRET_ACCESS_KEY',
    },
    isEnabled: true,
    isActive: false,
    isSandbox: false,
    priority: 2,
    notes: 'AWS S3 production storage bucket',
    tags: ['storage', 's3', 'cloud'],
  },
  {
    category: ProviderCategory.STORAGE,
    providerType: 'r2',
    name: 'Cloudflare R2 Storage',
    config: {
      bucket: 'voicecloud-r2-prod',
      accountId: 'CLOUDFLARE_ACCOUNT_ID',
      accessKeyId: 'R2_ACCESS_KEY',
      secretAccessKey: 'R2_SECRET',
    },
    isEnabled: true,
    isActive: false,
    isSandbox: false,
    priority: 3,
    notes: 'Zero egress cost storage',
    tags: ['storage', 'r2', 'cloudflare'],
  },

  // Payment
  {
    category: ProviderCategory.PAYMENT,
    providerType: 'razorpay',
    name: 'Razorpay Payment Gateway',
    config: {
      keyId: 'rzp_test_12345678',
      keySecret: 'rzp_secret_12345678',
      currency: 'INR',
    },
    isEnabled: true,
    isActive: true,
    isSandbox: true,
    priority: 1,
    notes: 'Active gateway for INR transactions',
    tags: ['payment', 'razorpay'],
  },
  {
    category: ProviderCategory.PAYMENT,
    providerType: 'stripe',
    name: 'Stripe International Payments',
    config: {
      publicKey: 'pk_test_123456',
      secretKey: 'sk_test_123456',
      currency: 'USD',
    },
    isEnabled: true,
    isActive: false,
    isSandbox: true,
    priority: 2,
    notes: 'Global credit card & wallet payments',
    tags: ['payment', 'stripe', 'global'],
  },
  {
    category: ProviderCategory.PAYMENT,
    providerType: 'google_play',
    name: 'Google Play Billing (Android)',
    config: { packageName: 'com.voicecloud.app', serviceAccountJson: '{}' },
    isEnabled: true,
    isActive: false,
    isSandbox: true,
    priority: 3,
    notes: 'In-app purchases for Android mobile app',
    tags: ['payment', 'google-play', 'android'],
  },

  // Firebase
  {
    category: ProviderCategory.FIREBASE,
    providerType: 'firebase',
    name: 'Firebase Cloud Messaging',
    config: {
      projectId: 'voicecloud-app',
      clientEmail: 'firebase-adminsdk@voicecloud-app.iam.gserviceaccount.com',
      privateKey:
        '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n',
      enablePush: true,
      enableAnalytics: true,
    },
    isEnabled: true,
    isActive: true,
    isSandbox: false,
    priority: 1,
    notes: 'Android FCM push notifications',
    tags: ['firebase', 'fcm', 'push'],
  },

  // Email
  {
    category: ProviderCategory.EMAIL,
    providerType: 'smtp',
    name: 'Standard SMTP Server',
    config: {
      host: 'smtp.voicecloud.app',
      port: 587,
      authUser: 'smtp_user',
      authPassword: 'smtp_password',
      fromEmail: 'noreply@voicecloud.app',
    },
    isEnabled: true,
    isActive: true,
    isSandbox: true,
    priority: 1,
    notes: 'Transactional email provider',
    tags: ['email', 'smtp'],
  },

  // SMS
  {
    category: ProviderCategory.SMS,
    providerType: 'twilio',
    name: 'Twilio SMS Service',
    config: {
      accountSid: 'AC_TWILIO_SID_DEFAULT',
      authToken: 'TWILIO_AUTH_TOKEN_DEFAULT',
      senderNumber: '+18005550199',
    },
    isEnabled: true,
    isActive: true,
    isSandbox: true,
    priority: 1,
    notes: 'OTP verification SMS service',
    tags: ['sms', 'twilio', 'otp'],
  },
  {
    category: ProviderCategory.SMS,
    providerType: 'msg91',
    name: 'MSG91 SMS Gateway',
    config: {
      authKey: 'MSG91_AUTH_KEY_DEFAULT',
      senderId: 'VCLOUD',
      templateId: '1007',
    },
    isEnabled: true,
    isActive: false,
    isSandbox: true,
    priority: 2,
    notes: 'India regional SMS gateway',
    tags: ['sms', 'msg91'],
  },

  // AI
  {
    category: ProviderCategory.AI,
    providerType: 'gemini',
    name: 'Google Gemini AI Engine',
    config: {
      apiKey: 'GEMINI_API_KEY_DEFAULT',
      model: 'gemini-2.5-flash',
      temperature: 0.7,
      maxTokens: 2048,
    },
    isEnabled: true,
    isActive: true,
    isSandbox: false,
    priority: 1,
    notes: 'Generative AI content moderation & assistant',
    tags: ['ai', 'gemini', 'google'],
  },

  // Maps
  {
    category: ProviderCategory.MAPS,
    providerType: 'google_maps',
    name: 'Google Maps Platform',
    config: {
      apiKey: 'GOOGLE_MAPS_KEY_DEFAULT',
      enablePlaces: true,
      enableGeocoding: true,
    },
    isEnabled: true,
    isActive: true,
    isSandbox: false,
    priority: 1,
    notes: 'Geocoding and regional location discovery',
    tags: ['maps', 'google-maps'],
  },
];

@Injectable()
export class AdminProvidersService implements OnModuleInit {
  private readonly logger = new Logger(AdminProvidersService.name);

  constructor(
    @InjectRepository(ProviderConfig)
    private readonly providerRepo: Repository<ProviderConfig>,
    @InjectRepository(ProviderConfigHistory)
    private readonly historyRepo: Repository<ProviderConfigHistory>,
    private readonly redisService: RedisService,
    private readonly eventsGateway: EventsGateway,
    private readonly auditLogsService: AdminAuditLogsService,
    private readonly encryptionService: EncryptionService,
    private readonly testService: ProviderTestConnectionService,
  ) {}

  async onModuleInit() {
    await this.seedDefaultProviders();
  }

  private async seedDefaultProviders() {
    for (const item of DEFAULT_PROVIDERS) {
      const existing = await this.providerRepo.findOne({
        where: {
          category: item.category,
          providerType: item.providerType,
        },
      });
      if (!existing) {
        // Encrypt secret fields in seed config
        const encryptedConfig = this.encryptionService.encryptConfig(
          item.config,
        );
        const provider = this.providerRepo.create({
          ...item,
          category: item.category,
          config: encryptedConfig,
          healthStatus: 'not_tested',
        });
        const saved = await this.providerRepo.save(provider);
        await this.recordHistory(saved, 'Initial seed creation');
        this.logger.log(
          `[Seed] Initialized provider profile: ${item.category}/${item.providerType}`,
        );
      }
    }
  }

  async findAll(): Promise<ProviderConfig[]> {
    const providers = await this.providerRepo.find({
      order: { category: 'ASC', priority: 'ASC', createdAt: 'ASC' },
    });

    // Sanitize configs to mask credentials for safe listing
    return providers.map((p) => ({
      ...p,
      config: this.encryptionService.sanitizeConfig(p.config || {}),
    }));
  }

  async findByCategory(category: ProviderCategory): Promise<ProviderConfig[]> {
    const providers = await this.providerRepo.find({
      where: { category },
      order: { priority: 'ASC', createdAt: 'ASC' },
    });

    return providers.map((p) => ({
      ...p,
      config: this.encryptionService.sanitizeConfig(p.config || {}),
    }));
  }

  async findOne(id: string): Promise<ProviderConfig> {
    const provider = await this.providerRepo.findOne({ where: { id } });
    if (!provider) {
      throw new NotFoundException(`Provider configuration '${id}' not found`);
    }
    return {
      ...provider,
      config: this.encryptionService.sanitizeConfig(provider.config || {}),
    };
  }

  async getPublicProviderSummary(): Promise<Record<string, any>> {
    const cached = await this.redisService.get(PUBLIC_PROVIDERS_CACHE);
    if (cached) {
      try {
        return JSON.parse(cached) as Record<string, any>;
      } catch {
        // Fallthrough
      }
    }

    const enabledProviders = await this.providerRepo.find({
      where: { isEnabled: true },
    });
    const summary: Record<string, any[]> = {};

    for (const p of enabledProviders) {
      if (!summary[p.category]) {
        summary[p.category] = [];
      }

      const safeConfig = this.encryptionService.sanitizeConfig(p.config || {});

      summary[p.category].push({
        id: p.id,
        providerType: p.providerType,
        name: p.name,
        isActive: p.isActive,
        isSandbox: p.isSandbox,
        priority: p.priority,
        healthStatus: p.healthStatus,
        publicConfig: safeConfig,
      });
    }

    await this.redisService.set(
      PUBLIC_PROVIDERS_CACHE,
      JSON.stringify(summary),
      3600,
    );
    return summary;
  }

  async create(
    dto: CreateProviderConfigDto,
    userId?: string,
  ): Promise<ProviderConfig> {
    // Encrypt secrets in configuration
    const encryptedConfig = this.encryptionService.encryptConfig(
      dto.config || {},
    );

    const provider = this.providerRepo.create({
      ...dto,
      config: encryptedConfig,
      healthStatus: 'not_tested',
    });

    const saved = await this.providerRepo.save(provider);

    if (saved.isActive) {
      await this.setCategoryActive(saved.category, saved.id);
    }

    await this.recordHistory(saved, 'Created new provider profile', userId);
    await this.invalidateCache(saved.category);

    await this.auditLogsService.log({
      userId,
      module: 'provider_configs',
      action: 'create',
      newValue: { ...saved, config: '[ENCRYPTED]' },
    });

    return {
      ...saved,
      config: this.encryptionService.sanitizeConfig(saved.config || {}),
    };
  }

  private mergeProviderConfig(
    current: Record<string, any>,
    incoming: Record<string, any>,
  ): Record<string, any> {
    const merged: Record<string, any> = { ...current };

    for (const [key, value] of Object.entries(incoming || {})) {
      if (typeof value === 'string' && value.includes('••••')) {
        continue;
      }

      const currentValue = current?.[key];
      if (
        value &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        currentValue &&
        typeof currentValue === 'object' &&
        !Array.isArray(currentValue)
      ) {
        merged[key] = this.mergeProviderConfig(currentValue, value);
      } else {
        merged[key] = value;
      }
    }

    return merged;
  }

  async update(
    id: string,
    dto: UpdateProviderConfigDto,
    userId?: string,
  ): Promise<ProviderConfig> {
    const provider = await this.providerRepo.findOne({ where: { id } });
    if (!provider) {
      throw new NotFoundException(`Provider configuration '${id}' not found`);
    }

    const previousValue = { ...provider };

    if (dto.config) {
      // Merge and re-encrypt secrets
      const currentDecrypted = this.encryptionService.decryptConfig(
        provider.config || {},
      );
      const mergedConfig = this.mergeProviderConfig(
        currentDecrypted,
        dto.config,
      );
      provider.config = this.encryptionService.encryptConfig(mergedConfig);
      provider.healthStatus = 'not_tested';
      provider.lastTestedAt = undefined;
      provider.lastLatencyMs = undefined;
      provider.lastErrorMessage = null;
      provider.statusDetails = {};
    }

    if (dto.name !== undefined) provider.name = dto.name;
    if (dto.isEnabled !== undefined) provider.isEnabled = dto.isEnabled;
    if (dto.isSandbox !== undefined) provider.isSandbox = dto.isSandbox;
    if (dto.priority !== undefined) provider.priority = dto.priority;
    if (dto.notes !== undefined) provider.notes = dto.notes;
    if (dto.tags !== undefined) provider.tags = dto.tags;

    if (dto.isActive && !provider.isActive) {
      await this.setCategoryActive(provider.category, provider.id);
      provider.isActive = true;
    } else if (dto.isActive === false) {
      provider.isActive = false;
    }

    const updated = await this.providerRepo.save(provider);

    if (
      updated.category === ProviderCategory.RTC &&
      updated.isActive &&
      updated.isEnabled
    ) {
      await this.providerRepo.manager.transaction((manager) =>
        this.syncRtcRuntimeConfig(manager, updated),
      );
    }

    await this.recordHistory(updated, 'Updated provider settings', userId);
    await this.invalidateCache(updated.category);

    await this.auditLogsService.log({
      userId,
      module: 'provider_configs',
      action: 'update',
      previousValue: { ...previousValue, config: '[ENCRYPTED]' },
      newValue: { ...updated, config: '[ENCRYPTED]' },
    });

    return {
      ...updated,
      config: this.encryptionService.sanitizeConfig(updated.config || {}),
    };
  }

  async setActive(id: string, userId?: string): Promise<ProviderConfig> {
    const provider = await this.providerRepo.findOne({ where: { id } });
    if (!provider) {
      throw new NotFoundException(`Provider configuration '${id}' not found`);
    }

    await this.setCategoryActive(provider.category, provider.id);
    provider.isActive = true;
    provider.isEnabled = true; // Auto-enable active provider
    const updated = await this.providerRepo.save(provider);

    await this.recordHistory(
      updated,
      `Set profile as active for category ${provider.category}`,
      userId,
    );
    await this.invalidateCache(provider.category);

    await this.auditLogsService.log({
      userId,
      module: 'provider_configs',
      action: 'activate',
      newValue: {
        id: updated.id,
        category: updated.category,
        name: updated.name,
      },
    });

    return {
      ...updated,
      config: this.encryptionService.sanitizeConfig(updated.config || {}),
    };
  }

  async testConnection(id: string): Promise<any> {
    const provider = await this.providerRepo.findOne({ where: { id } });
    if (!provider) {
      throw new NotFoundException(`Provider configuration '${id}' not found`);
    }

    const result = await this.testService.testProvider(provider);

    // Update health metrics in database
    provider.lastTestedAt = result.testedAt;
    provider.lastLatencyMs = result.latencyMs;
    provider.healthStatus = result.success ? 'healthy' : 'unhealthy';
    provider.statusDetails = result.details || {};

    if (result.success) {
      provider.successCount = (provider.successCount || 0) + 1;
      provider.lastSuccessAt = result.testedAt;
      provider.lastErrorMessage = null;
    } else {
      provider.failureCount = (provider.failureCount || 0) + 1;
      provider.lastErrorMessage = result.message;
    }

    const testedProvider = await this.providerRepo.save(provider);
    if (
      result.success &&
      testedProvider.category === ProviderCategory.RTC &&
      testedProvider.isActive &&
      testedProvider.isEnabled
    ) {
      await this.providerRepo.manager.transaction((manager) =>
        this.syncRtcRuntimeConfig(manager, testedProvider),
      );
    }
    await this.invalidateCache(provider.category);

    return {
      providerId: provider.id,
      name: provider.name,
      category: provider.category,
      providerType: provider.providerType,
      ...result,
    };
  }

  async getHealthSummary(): Promise<Record<string, any>> {
    const allProviders = await this.providerRepo.find();
    const summary: Record<string, any> = {
      total: allProviders.length,
      healthy: 0,
      degraded: 0,
      unhealthy: 0,
      notTested: 0,
      byCategory: {},
    };

    for (const p of allProviders) {
      if (!summary.byCategory[p.category]) {
        summary.byCategory[p.category] = {
          total: 0,
          active: null,
          healthy: 0,
          unhealthy: 0,
          notTested: 0,
        };
      }

      summary.byCategory[p.category].total += 1;
      if (p.isActive) {
        summary.byCategory[p.category].active = {
          id: p.id,
          name: p.name,
          providerType: p.providerType,
          healthStatus: p.healthStatus,
          lastLatencyMs: p.lastLatencyMs,
        };
      }

      if (p.healthStatus === 'healthy') {
        summary.healthy += 1;
        summary.byCategory[p.category].healthy += 1;
      } else if (p.healthStatus === 'degraded') {
        summary.degraded += 1;
      } else if (p.healthStatus === 'unhealthy') {
        summary.unhealthy += 1;
        summary.byCategory[p.category].unhealthy += 1;
      } else {
        summary.notTested += 1;
        summary.byCategory[p.category].notTested += 1;
      }
    }

    return summary;
  }

  async revealSecret(
    id: string,
    userId?: string,
  ): Promise<Record<string, any>> {
    const provider = await this.providerRepo.findOne({ where: { id } });
    if (!provider) {
      throw new NotFoundException(`Provider configuration '${id}' not found`);
    }

    const decrypted = this.encryptionService.decryptConfig(
      provider.config || {},
    );

    await this.auditLogsService.log({
      userId,
      module: 'provider_configs',
      action: 'reveal_secret',
      newValue: {
        providerId: id,
        category: provider.category,
        name: provider.name,
      },
    });

    return {
      providerId: provider.id,
      name: provider.name,
      config: decrypted,
    };
  }

  async rotateSecret(
    id: string,
    dto: RotateSecretDto,
    userId?: string,
  ): Promise<ProviderConfig> {
    const provider = await this.providerRepo.findOne({ where: { id } });
    if (!provider) {
      throw new NotFoundException(`Provider configuration '${id}' not found`);
    }

    const currentDecrypted = this.encryptionService.decryptConfig(
      provider.config || {},
    );
    const newDecrypted = { ...currentDecrypted, ...dto.secretConfig };
    provider.config = this.encryptionService.encryptConfig(newDecrypted);
    provider.healthStatus = 'not_tested';
    provider.lastTestedAt = undefined;
    provider.lastLatencyMs = undefined;
    provider.lastErrorMessage = null;
    provider.statusDetails = {};

    const updated = await this.providerRepo.save(provider);
    if (
      updated.category === ProviderCategory.RTC &&
      updated.isActive &&
      updated.isEnabled
    ) {
      await this.providerRepo.manager.transaction((manager) =>
        this.syncRtcRuntimeConfig(manager, updated),
      );
    }
    await this.recordHistory(
      updated,
      dto.reason || 'Secret credential rotation',
      userId,
    );
    await this.invalidateCache(updated.category);

    await this.auditLogsService.log({
      userId,
      module: 'provider_configs',
      action: 'rotate_secret',
      newValue: { providerId: id, name: updated.name },
    });

    return {
      ...updated,
      config: this.encryptionService.sanitizeConfig(updated.config || {}),
    };
  }

  async getHistory(id: string): Promise<ProviderConfigHistory[]> {
    return this.historyRepo.find({
      where: { providerConfigId: id },
      order: { version: 'DESC' },
    });
  }

  async rollback(
    id: string,
    historyId: string,
    userId?: string,
  ): Promise<ProviderConfig> {
    const provider = await this.providerRepo.findOne({ where: { id } });
    if (!provider) {
      throw new NotFoundException(`Provider configuration '${id}' not found`);
    }

    const history = await this.historyRepo.findOne({
      where: { id: historyId },
    });
    if (!history) {
      throw new NotFoundException(
        `Configuration revision history '${historyId}' not found`,
      );
    }

    provider.name = history.name;
    provider.config = history.config;
    provider.isEnabled = history.isEnabled;
    provider.isActive = history.isActive;
    provider.healthStatus = 'not_tested';
    provider.lastTestedAt = undefined;
    provider.lastLatencyMs = undefined;
    provider.lastErrorMessage = null;
    provider.statusDetails = {};

    const restored = await this.providerRepo.save(provider);
    if (
      restored.category === ProviderCategory.RTC &&
      restored.isActive &&
      restored.isEnabled
    ) {
      await this.providerRepo.manager.transaction((manager) =>
        this.syncRtcRuntimeConfig(manager, restored),
      );
    }
    await this.recordHistory(
      restored,
      `Rolled back to version ${history.version}`,
      userId,
    );
    await this.invalidateCache(restored.category);

    await this.auditLogsService.log({
      userId,
      module: 'provider_configs',
      action: 'rollback',
      newValue: { providerId: id, version: history.version },
    });

    return {
      ...restored,
      config: this.encryptionService.sanitizeConfig(restored.config || {}),
    };
  }

  async remove(id: string, userId?: string): Promise<void> {
    const provider = await this.providerRepo.findOne({ where: { id } });
    if (provider) {
      await this.providerRepo.remove(provider);
      await this.invalidateCache(provider.category);

      await this.auditLogsService.log({
        userId,
        module: 'provider_configs',
        action: 'delete',
        previousValue: {
          id: provider.id,
          name: provider.name,
          category: provider.category,
        },
      });
    }
  }

  private async syncRtcRuntimeConfig(
    manager: EntityManager,
    selectedProvider: ProviderConfig,
  ): Promise<void> {
    const providerType = selectedProvider.providerType.trim().toLowerCase();
    if (!Object.values(RtcProviderType).includes(providerType as RtcProviderType)) {
      throw new NotFoundException(
        `Unsupported RTC provider type '${selectedProvider.providerType}'`,
      );
    }

    const rtcConfigRepo = manager.getRepository(RtcConfig);
    let rtcConfig = await rtcConfigRepo.findOne({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
    });
    if (!rtcConfig) {
      rtcConfig = rtcConfigRepo.create({
        activeProvider: providerType as RtcProviderType,
        tokenExpiration: 3600,
        recordingEnabled: true,
        audioEnabled: true,
        videoEnabled: false,
        isActive: true,
      });
    }

    const providerConfig = this.encryptionService.decryptConfig(
      selectedProvider.config || {},
    );
    rtcConfig.activeProvider = providerType as RtcProviderType;

    if (providerType === RtcProviderType.AGORA) {
      rtcConfig.appId = String(providerConfig.appId || '');
      rtcConfig.appCertificate = String(providerConfig.appCertificate || '');
    } else if (providerType === RtcProviderType.LIVEKIT) {
      const liveKit = resolveLiveKitProviderConfig(providerConfig);
      rtcConfig.apiKey = liveKit.apiKey;
      rtcConfig.secret = liveKit.apiSecret;
      if (liveKit.tokenExpiration) rtcConfig.tokenExpiration = liveKit.tokenExpiration;
    } else if (providerType === RtcProviderType.ZEGOCLOUD) {
      rtcConfig.appId = String(providerConfig.appId || '');
      rtcConfig.secret = String(providerConfig.serverSecret || providerConfig.secret || '');
    }

    if (Number.isSafeInteger(Number(providerConfig.tokenExpiration))) {
      rtcConfig.tokenExpiration = Number(providerConfig.tokenExpiration);
    }
    await rtcConfigRepo.save(rtcConfig);
  }

  private async setCategoryActive(
    category: ProviderCategory,
    activeId: string,
  ) {
    await this.providerRepo.manager.transaction(async (manager) => {
      const providerRepo = manager.getRepository(ProviderConfig);
      const selectedProvider = await providerRepo.findOne({
        where: { id: activeId, category },
      });
      if (!selectedProvider) {
        throw new NotFoundException(
          `Provider configuration '${activeId}' not found for category '${category}'`,
        );
      }
      if (category === ProviderCategory.RTC) {
        const rtcProviderType = selectedProvider.providerType.trim().toLowerCase();
        const developmentMockAllowed =
          rtcProviderType === RtcProviderType.DEFAULT_MOCK &&
          process.env.NODE_ENV !== 'production' &&
          process.env.ENABLE_RTC_MOCK_PROVIDER === 'true';

        if (rtcProviderType !== RtcProviderType.LIVEKIT && !developmentMockAllowed) {
          throw new BadRequestException(
            `RTC provider '${selectedProvider.providerType}' is not operational in this VoiceCloud build. Configure, test, and activate LiveKit for browser voice rooms.`,
          );
        }
        if (selectedProvider.healthStatus !== 'healthy') {
          throw new BadRequestException(
            rtcProviderType === RtcProviderType.LIVEKIT
              ? 'Test the LiveKit Project URL, API Key, and API Secret successfully before setting this provider active'
              : 'Test the explicitly enabled development RTC mock before setting it active',
          );
        }
      }

      await providerRepo.update({ category }, { isActive: false });
      await providerRepo.update(
        { id: activeId },
        { isActive: true, isEnabled: true },
      );

      if (category === ProviderCategory.RTC) {
        await this.syncRtcRuntimeConfig(manager, selectedProvider);
      }
    });
  }

  private async recordHistory(
    provider: ProviderConfig,
    reason?: string,
    userId?: string,
  ) {
    const latestVersion = await this.historyRepo.count({
      where: { providerConfigId: provider.id },
    });
    const history = this.historyRepo.create({
      providerConfigId: provider.id,
      category: provider.category,
      providerType: provider.providerType,
      name: provider.name,
      config: provider.config,
      isEnabled: provider.isEnabled,
      isActive: provider.isActive,
      version: latestVersion + 1,
      changedByUserId: userId,
      changeReason: reason,
    });
    await this.historyRepo.save(history);
  }

  private async invalidateCache(category: ProviderCategory) {
    await this.redisService.del(PUBLIC_PROVIDERS_CACHE);
    await this.redisService.del(`cache:provider:active:${category}`);
    this.eventsGateway.broadcastSystemConfigEvent('provider_updated', {
      category,
      timestamp: Date.now(),
    });
  }
}
