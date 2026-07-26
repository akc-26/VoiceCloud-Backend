import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ProviderConfig,
  ProviderCategory,
} from './entities/provider-config.entity';
import {
  CreateProviderConfigDto,
  UpdateProviderConfigDto,
} from './dto/provider-config.dto';
import { RedisService } from '../../redis/redis.service';
import { EventsGateway } from '../../common/events/events.gateway';
import { AdminAuditLogsService } from './admin-audit-logs.service';

const PUBLIC_PROVIDERS_CACHE = 'cache:provider_configs:public';

const DEFAULT_PROVIDERS = [
  // RTC
  {
    category: ProviderCategory.RTC,
    providerType: 'agora',
    name: 'Agora RTC Engine',
    config: { appId: 'AGORA_APP_ID_DEFAULT', tokenExpiration: 3600 },
    isEnabled: true,
    isSandbox: false,
    priority: 1,
  },
  {
    category: ProviderCategory.RTC,
    providerType: 'livekit',
    name: 'LiveKit Cloud',
    config: { apiKey: 'LIVEKIT_API_KEY', tokenExpiration: 3600 },
    isEnabled: false,
    isSandbox: true,
    priority: 2,
  },
  {
    category: ProviderCategory.RTC,
    providerType: 'zegocloud',
    name: 'ZEGOCLOUD Express',
    config: { appId: 'ZEGO_APP_ID' },
    isEnabled: false,
    isSandbox: true,
    priority: 3,
  },
  {
    category: ProviderCategory.RTC,
    providerType: '100ms',
    name: '100ms Live',
    config: { accessKey: '100MS_KEY' },
    isEnabled: false,
    isSandbox: true,
    priority: 4,
  },
  {
    category: ProviderCategory.RTC,
    providerType: 'daily',
    name: 'Daily.co',
    config: { apiKey: 'DAILY_KEY' },
    isEnabled: false,
    isSandbox: true,
    priority: 5,
  },

  // Payment
  {
    category: ProviderCategory.PAYMENT,
    providerType: 'razorpay',
    name: 'Razorpay Gateway',
    config: { keyId: 'rzp_test_123', currency: 'INR' },
    isEnabled: true,
    isSandbox: true,
    priority: 1,
  },
  {
    category: ProviderCategory.PAYMENT,
    providerType: 'stripe',
    name: 'Stripe Payments',
    config: { publicKey: 'pk_test_123', currency: 'USD' },
    isEnabled: true,
    isSandbox: true,
    priority: 2,
  },
  {
    category: ProviderCategory.PAYMENT,
    providerType: 'paypal',
    name: 'PayPal Checkout',
    config: { clientId: 'paypal_client_123', currency: 'USD' },
    isEnabled: false,
    isSandbox: true,
    priority: 3,
  },
  {
    category: ProviderCategory.PAYMENT,
    providerType: 'phonepe',
    name: 'PhonePe Direct',
    config: { merchantId: 'PHONEPE_MERCHANT' },
    isEnabled: false,
    isSandbox: true,
    priority: 4,
  },
  {
    category: ProviderCategory.PAYMENT,
    providerType: 'cashfree',
    name: 'Cashfree Payments',
    config: { appId: 'CASHFREE_APP' },
    isEnabled: false,
    isSandbox: true,
    priority: 5,
  },
  {
    category: ProviderCategory.PAYMENT,
    providerType: 'paytm',
    name: 'Paytm Business',
    config: { mid: 'PAYTM_MID' },
    isEnabled: false,
    isSandbox: true,
    priority: 6,
  },

  // Firebase
  {
    category: ProviderCategory.FIREBASE,
    providerType: 'firebase',
    name: 'Firebase Cloud Messaging & Services',
    config: {
      projectId: 'voicecloud-app',
      enablePush: true,
      enableAnalytics: true,
      enableCrashlytics: true,
    },
    isEnabled: true,
    isSandbox: false,
    priority: 1,
  },

  // Storage
  {
    category: ProviderCategory.STORAGE,
    providerType: 'local',
    name: 'Local File Storage',
    config: { basePath: './uploads' },
    isEnabled: true,
    isSandbox: true,
    priority: 1,
  },
  {
    category: ProviderCategory.STORAGE,
    providerType: 's3',
    name: 'AWS S3 Bucket',
    config: { bucket: 'voicecloud-media', region: 'us-east-1' },
    isEnabled: true,
    isSandbox: false,
    priority: 2,
  },
  {
    category: ProviderCategory.STORAGE,
    providerType: 'r2',
    name: 'Cloudflare R2',
    config: { bucket: 'voicecloud-r2' },
    isEnabled: false,
    isSandbox: true,
    priority: 3,
  },
  {
    category: ProviderCategory.STORAGE,
    providerType: 'backblaze',
    name: 'Backblaze B2',
    config: { bucket: 'voicecloud-b2' },
    isEnabled: false,
    isSandbox: true,
    priority: 4,
  },
  {
    category: ProviderCategory.STORAGE,
    providerType: 'gcs',
    name: 'Google Cloud Storage',
    config: { bucket: 'voicecloud-gcs' },
    isEnabled: false,
    isSandbox: true,
    priority: 5,
  },
  {
    category: ProviderCategory.STORAGE,
    providerType: 'azure',
    name: 'Azure Blob Storage',
    config: { container: 'voicecloud-blob' },
    isEnabled: false,
    isSandbox: true,
    priority: 6,
  },

  // Email
  {
    category: ProviderCategory.EMAIL,
    providerType: 'smtp',
    name: 'Standard SMTP Mailer',
    config: { host: 'smtp.voicecloud.app', port: 587 },
    isEnabled: true,
    isSandbox: true,
    priority: 1,
  },
  {
    category: ProviderCategory.EMAIL,
    providerType: 'sendgrid',
    name: 'SendGrid Email Engine',
    config: { fromEmail: 'noreply@voicecloud.app' },
    isEnabled: false,
    isSandbox: true,
    priority: 2,
  },
  {
    category: ProviderCategory.EMAIL,
    providerType: 'mailgun',
    name: 'Mailgun Transactional',
    config: { domain: 'mail.voicecloud.app' },
    isEnabled: false,
    isSandbox: true,
    priority: 3,
  },
  {
    category: ProviderCategory.EMAIL,
    providerType: 'ses',
    name: 'Amazon SES',
    config: { region: 'us-east-1' },
    isEnabled: false,
    isSandbox: true,
    priority: 4,
  },

  // SMS
  {
    category: ProviderCategory.SMS,
    providerType: 'twilio',
    name: 'Twilio SMS Gateway',
    config: { senderNumber: '+1234567890' },
    isEnabled: true,
    isSandbox: true,
    priority: 1,
  },
  {
    category: ProviderCategory.SMS,
    providerType: 'msg91',
    name: 'MSG91 SMS',
    config: { senderId: 'VCLOUD' },
    isEnabled: false,
    isSandbox: true,
    priority: 2,
  },
  {
    category: ProviderCategory.SMS,
    providerType: 'textlocal',
    name: 'TextLocal SMS',
    config: { sender: 'VCLOUD' },
    isEnabled: false,
    isSandbox: true,
    priority: 3,
  },
  {
    category: ProviderCategory.SMS,
    providerType: 'sns',
    name: 'AWS SNS SMS',
    config: { region: 'us-east-1' },
    isEnabled: false,
    isSandbox: true,
    priority: 4,
  },

  // AI
  {
    category: ProviderCategory.AI,
    providerType: 'gemini',
    name: 'Google Gemini AI',
    config: { model: 'gemini-2.5-flash', temperature: 0.7, maxTokens: 2048 },
    isEnabled: true,
    isSandbox: false,
    priority: 1,
  },
  {
    category: ProviderCategory.AI,
    providerType: 'openai',
    name: 'OpenAI GPT-4o',
    config: { model: 'gpt-4o-mini', temperature: 0.7 },
    isEnabled: false,
    isSandbox: true,
    priority: 2,
  },
  {
    category: ProviderCategory.AI,
    providerType: 'claude',
    name: 'Anthropic Claude 3.5',
    config: { model: 'claude-3-5-sonnet' },
    isEnabled: false,
    isSandbox: true,
    priority: 3,
  },
  {
    category: ProviderCategory.AI,
    providerType: 'grok',
    name: 'xAI Grok',
    config: { model: 'grok-2' },
    isEnabled: false,
    isSandbox: true,
    priority: 4,
  },
  {
    category: ProviderCategory.AI,
    providerType: 'deepseek',
    name: 'DeepSeek AI',
    config: { model: 'deepseek-chat' },
    isEnabled: false,
    isSandbox: true,
    priority: 5,
  },
];

@Injectable()
export class AdminProvidersService implements OnModuleInit {
  private readonly logger = new Logger(AdminProvidersService.name);

  constructor(
    @InjectRepository(ProviderConfig)
    private readonly providerRepo: Repository<ProviderConfig>,
    private readonly redisService: RedisService,
    private readonly eventsGateway: EventsGateway,
    private readonly auditLogsService: AdminAuditLogsService,
  ) {}

  async onModuleInit() {
    await this.seedDefaultProviders();
  }

  private async seedDefaultProviders() {
    for (const item of DEFAULT_PROVIDERS) {
      const existing = await this.providerRepo.findOne({
        where: { category: item.category, providerType: item.providerType },
      });
      if (existing) {
        let updated = false;
        if (
          existing.name !== item.name ||
          existing.priority !== item.priority
        ) {
          existing.name = item.name;
          existing.priority = item.priority;
          updated = true;
        }
        if (updated) {
          await this.providerRepo.save(existing);
        }
      } else {
        const provider = this.providerRepo.create(item);
        await this.providerRepo.save(provider);
        this.logger.log(
          `[Seed] Created provider config: ${item.category}/${item.providerType}`,
        );
      }
    }
  }

  async findAll(): Promise<ProviderConfig[]> {
    return this.providerRepo.find({
      order: { category: 'ASC', priority: 'ASC' },
    });
  }

  async findByCategory(category: ProviderCategory): Promise<ProviderConfig[]> {
    return this.providerRepo.find({
      where: { category },
      order: { priority: 'ASC' },
    });
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
      // Sanitize config - remove secret keys
      const safeConfig: Record<string, unknown> = {};
      if (p.config) {
        for (const [k, v] of Object.entries(p.config)) {
          if (
            !k.toLowerCase().includes('secret') &&
            !k.toLowerCase().includes('key') &&
            !k.toLowerCase().includes('password')
          ) {
            safeConfig[k] = v as unknown;
          }
        }
      }

      summary[p.category].push({
        providerType: p.providerType,
        name: p.name,
        isSandbox: p.isSandbox,
        priority: p.priority,
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
    const provider = this.providerRepo.create(dto);
    const saved = await this.providerRepo.save(provider);

    await this.redisService.del(PUBLIC_PROVIDERS_CACHE);
    this.eventsGateway.broadcastSystemConfigEvent('provider_created', {
      category: saved.category,
      providerType: saved.providerType,
    });

    await this.auditLogsService.log({
      userId,
      module: 'provider_configs',
      action: 'create',
      newValue: saved,
    });

    return saved;
  }

  async update(
    id: string,
    dto: UpdateProviderConfigDto,
    userId?: string,
  ): Promise<ProviderConfig> {
    const provider = await this.providerRepo.findOne({ where: { id } });
    if (!provider) {
      throw new Error(`Provider config with id '${id}' not found`);
    }

    const previousValue = { ...provider };
    Object.assign(provider, dto);
    const updated = await this.providerRepo.save(provider);

    await this.redisService.del(PUBLIC_PROVIDERS_CACHE);
    this.eventsGateway.broadcastSystemConfigEvent('provider_updated', {
      id: updated.id,
      category: updated.category,
    });

    await this.auditLogsService.log({
      userId,
      module: 'provider_configs',
      action: 'update',
      previousValue: previousValue,
      newValue: updated,
    });

    return updated;
  }

  async remove(id: string, userId?: string): Promise<void> {
    const provider = await this.providerRepo.findOne({ where: { id } });
    if (provider) {
      await this.providerRepo.remove(provider);
      await this.redisService.del(PUBLIC_PROVIDERS_CACHE);

      await this.auditLogsService.log({
        userId,
        module: 'provider_configs',
        action: 'delete',
        previousValue: provider,
      });
    }
  }
}
