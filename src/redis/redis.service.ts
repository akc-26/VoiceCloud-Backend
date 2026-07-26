import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';
import { AppLogger } from '../common/logger/app-logger.service';

@Injectable()
export class RedisService implements OnModuleDestroy {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redisClient: Redis,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {
    this.logger.setContext('RedisService');
  }

  async ping(): Promise<boolean> {
    try {
      const result = await this.redisClient.ping();
      return result === 'PONG';
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Redis connection check failed: ${msg}`);
      return false;
    }
  }

  getClient(): Redis {
    return this.redisClient;
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.redisClient.get(key);
    } catch {
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds = 300): Promise<void> {
    try {
      await this.redisClient.set(key, value, 'EX', ttlSeconds);
    } catch {
      // ignore cache set error
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redisClient.del(key);
    } catch {
      // ignore cache del error
    }
  }

  async onModuleDestroy() {
    this.logger.log('Disconnecting Redis Client...');
    await this.redisClient.quit();
  }
}
