import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FeatureFlag } from './entities/feature-flag.entity';
import {
  CreateFeatureFlagDto,
  UpdateFeatureFlagDto,
} from './dto/feature-flag.dto';
import { RedisService } from '../../redis/redis.service';
import { EventsGateway } from '../../common/events/events.gateway';
import { AdminAuditLogsService } from './admin-audit-logs.service';

const FEATURE_FLAGS_CACHE_KEY = 'cache:feature_flags';

const DEFAULT_FEATURE_FLAGS = [
  {
    key: 'enable_wallet',
    name: 'Wallet System',
    description: 'Enable wallet balance and transactions',
    isEnabled: true,
  },
  {
    key: 'enable_gifts',
    name: 'Virtual Gifts',
    description: 'Enable gifting in rooms and chat',
    isEnabled: true,
  },
  {
    key: 'enable_rtc',
    name: 'RTC Audio Engine',
    description: 'Enable real-time voice room calls',
    isEnabled: true,
  },
  {
    key: 'enable_agencies',
    name: 'Agency Management',
    description: 'Enable host agency management features',
    isEnabled: true,
  },
  {
    key: 'enable_vip',
    name: 'VIP Membership',
    description: 'Enable VIP tiers and privileges',
    isEnabled: true,
  },
  {
    key: 'enable_notifications',
    name: 'Push Notifications',
    description: 'Enable push and in-app notifications',
    isEnabled: true,
  },
  {
    key: 'enable_discovery',
    name: 'Discovery Engine',
    description: 'Enable explore, trending and recommendation feeds',
    isEnabled: true,
  },
  {
    key: 'enable_search',
    name: 'Global Search',
    description: 'Enable search across users, rooms and tags',
    isEnabled: true,
  },
  {
    key: 'enable_moderation',
    name: 'Content Moderation',
    description: 'Enable reporting and moderation controls',
    isEnabled: true,
  },
  {
    key: 'enable_cms',
    name: 'CMS Pages',
    description: 'Enable dynamic CMS policy and help pages',
    isEnabled: true,
  },
  {
    key: 'enable_chat',
    name: 'Live Chat',
    description: 'Enable room chat and direct messaging',
    isEnabled: true,
  },
  {
    key: 'enable_storage',
    name: 'Storage & Uploads',
    description: 'Enable media storage and uploads',
    isEnabled: true,
  },
  {
    key: 'enable_uploads',
    name: 'User Avatar Uploads',
    description: 'Enable custom avatar and banner uploads',
    isEnabled: true,
  },
  {
    key: 'enable_registration',
    name: 'User Registration',
    description: 'Enable new user signups',
    isEnabled: true,
  },
  {
    key: 'enable_guest_login',
    name: 'Guest Access',
    description: 'Enable anonymous guest login mode',
    isEnabled: true,
  },
  {
    key: 'enable_social_login',
    name: 'Social Login',
    description: 'Enable OAuth social logins',
    isEnabled: true,
  },
];

@Injectable()
export class AdminFeatureFlagsService implements OnModuleInit {
  private readonly logger = new Logger(AdminFeatureFlagsService.name);

  constructor(
    @InjectRepository(FeatureFlag)
    private readonly flagRepo: Repository<FeatureFlag>,
    private readonly redisService: RedisService,
    private readonly eventsGateway: EventsGateway,
    private readonly auditLogsService: AdminAuditLogsService,
  ) {}

  async onModuleInit() {
    await this.seedDefaultFlags();
  }

  private async seedDefaultFlags() {
    for (const item of DEFAULT_FEATURE_FLAGS) {
      const existing = await this.flagRepo.findOne({
        where: { key: item.key },
      });
      if (existing) {
        let updated = false;
        if (
          existing.name !== item.name ||
          existing.description !== item.description
        ) {
          existing.name = item.name;
          existing.description = item.description;
          updated = true;
        }
        if (updated) {
          await this.flagRepo.save(existing);
        }
      } else {
        const flag = this.flagRepo.create(item);
        await this.flagRepo.save(flag);
        this.logger.log(`[Seed] Created feature flag: ${item.key}`);
      }
    }
  }

  async getAllFlagsMap(): Promise<Record<string, boolean>> {
    const cached = await this.redisService.get(FEATURE_FLAGS_CACHE_KEY);
    if (cached) {
      try {
        return JSON.parse(cached) as Record<string, boolean>;
      } catch {
        // Fallthrough
      }
    }

    const flags = await this.flagRepo.find();
    const map: Record<string, boolean> = {};
    for (const f of flags) {
      map[f.key] = f.isEnabled;
    }

    await this.redisService.set(
      FEATURE_FLAGS_CACHE_KEY,
      JSON.stringify(map),
      3600,
    );
    return map;
  }

  async findAll(): Promise<FeatureFlag[]> {
    return this.flagRepo.find({ order: { key: 'ASC' } });
  }

  async findByKey(key: string): Promise<FeatureFlag | null> {
    return this.flagRepo.findOne({ where: { key } });
  }

  async create(
    dto: CreateFeatureFlagDto,
    userId?: string,
  ): Promise<FeatureFlag> {
    const flag = this.flagRepo.create(dto);
    const saved = await this.flagRepo.save(flag);

    await this.redisService.del(FEATURE_FLAGS_CACHE_KEY);
    this.eventsGateway.broadcastFeatureFlagUpdated({
      key: saved.key,
      isEnabled: saved.isEnabled,
    });

    await this.auditLogsService.log({
      userId,
      module: 'feature_flags',
      action: 'create',
      newValue: saved,
    });

    return saved;
  }

  async update(
    key: string,
    dto: UpdateFeatureFlagDto,
    userId?: string,
  ): Promise<FeatureFlag> {
    const flag = await this.findByKey(key);
    if (!flag) {
      throw new Error(`Feature flag with key '${key}' not found`);
    }

    const previousValue = { ...flag };
    Object.assign(flag, dto);
    const updated = await this.flagRepo.save(flag);

    await this.redisService.del(FEATURE_FLAGS_CACHE_KEY);
    this.eventsGateway.broadcastFeatureFlagUpdated({
      key: updated.key,
      isEnabled: updated.isEnabled,
    });

    await this.auditLogsService.log({
      userId,
      module: 'feature_flags',
      action: 'update',
      previousValue: previousValue,
      newValue: updated,
    });

    return updated;
  }

  async toggle(
    key: string,
    isEnabled: boolean,
    userId?: string,
  ): Promise<FeatureFlag> {
    return this.update(key, { isEnabled }, userId);
  }
}
