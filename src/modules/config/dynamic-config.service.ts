import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ProviderConfig,
  ProviderCategory,
} from '../admin/entities/provider-config.entity';
import { EncryptionService } from '../../common/services/encryption.service';
import { RedisService } from '../../redis/redis.service';
import { EventsGateway } from '../../common/events/events.gateway';

const ACTIVE_PROVIDER_CACHE_PREFIX = 'cache:provider:active:';

@Injectable()
export class DynamicConfigService implements OnModuleInit {
  private readonly logger = new Logger(DynamicConfigService.name);

  constructor(
    @InjectRepository(ProviderConfig)
    private readonly providerRepo: Repository<ProviderConfig>,
    private readonly encryptionService: EncryptionService,
    private readonly redisService: RedisService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async onModuleInit() {
    this.logger.log('Dynamic Configuration Engine initialized');
  }

  /**
   * Retrieves the currently active, decrypted provider configuration for a category.
   * Order of precedence:
   * 1. Profile with `isActive: true` and `isEnabled: true`
   * 2. First enabled profile sorted by `priority: ASC`
   */
  async getActiveProviderConfig(
    category: ProviderCategory,
  ): Promise<ProviderConfig | null> {
    const cacheKey = `${ACTIVE_PROVIDER_CACHE_PREFIX}${category}`;

    try {
      const cached = await this.redisService.get(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as ProviderConfig;
        // Decrypt secrets before returning to internal business services
        parsed.config = this.encryptionService.decryptConfig(
          parsed.config || {},
        );
        return parsed;
      }
    } catch {
      // Cache miss or parse error - fallthrough to database
    }

    // DB Query
    let provider = await this.providerRepo.findOne({
      where: { category, isActive: true, isEnabled: true },
    });

    if (!provider) {
      // Fallback to highest priority enabled provider
      provider = await this.providerRepo.findOne({
        where: { category, isEnabled: true },
        order: { priority: 'ASC' },
      });
    }

    if (provider) {
      // Cache the raw stored entity (with encrypted secrets)
      try {
        await this.redisService.set(
          cacheKey,
          JSON.stringify(provider),
          3600, // 1 hour TTL
        );
      } catch (err) {
        this.logger.warn(
          `Failed to set Redis cache for ${cacheKey}: ${(err as Error).message}`,
        );
      }

      // Return copy with decrypted config for consumption
      const result = { ...provider };
      result.config = this.encryptionService.decryptConfig(
        provider.config || {},
      );
      return result;
    }

    return null;
  }

  /**
   * Retrieves one enabled provider configuration by category and provider type.
   * This is used by provider adapters that must validate against the exact
   * gateway requested by a client rather than silently using the category's
   * currently-active provider.
   */
  async getProviderConfig(
    category: ProviderCategory,
    providerType: string,
  ): Promise<ProviderConfig | null> {
    const normalizedType = providerType.trim().toLowerCase();
    const provider = await this.providerRepo
      .createQueryBuilder('provider')
      .where('provider.category = :category', { category })
      .andWhere('LOWER(provider.providerType) = :providerType', {
        providerType: normalizedType,
      })
      .andWhere('provider.isEnabled = :enabled', { enabled: true })
      .orderBy('provider.isActive', 'DESC')
      .addOrderBy('provider.priority', 'ASC')
      .getOne();

    if (!provider) {
      return null;
    }

    const result = { ...provider };
    result.config = this.encryptionService.decryptConfig(provider.config || {});
    return result;
  }

  /**
   * Invalidates cached provider config for a category (or all categories)
   */
  async invalidateCategoryCache(category?: ProviderCategory): Promise<void> {
    if (category) {
      const cacheKey = `${ACTIVE_PROVIDER_CACHE_PREFIX}${category}`;
      await this.redisService.del(cacheKey);
    } else {
      for (const cat of Object.values(ProviderCategory)) {
        await this.redisService.del(`${ACTIVE_PROVIDER_CACHE_PREFIX}${cat}`);
      }
    }
    // Also clear public summary cache
    await this.redisService.del('cache:provider_configs:public');

    // Notify connected instances via Socket.IO system config event
    this.eventsGateway.broadcastSystemConfigEvent('provider_config_changed', {
      category,
      timestamp: Date.now(),
    });
  }

  /**
   * Gets active configs for all categories
   */
  async getAllActiveProviders(): Promise<
    Record<string, ProviderConfig | null>
  > {
    const result: Record<string, ProviderConfig | null> = {};
    for (const cat of Object.values(ProviderCategory)) {
      result[cat] = await this.getActiveProviderConfig(cat);
    }
    return result;
  }
}
