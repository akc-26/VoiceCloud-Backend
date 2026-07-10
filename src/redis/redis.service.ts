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
      this.logger.error(`Redis connection check failed: ${error.message}`);
      return false;
    }
  }

  getClient(): Redis {
    return this.redisClient;
  }

  async onModuleDestroy() {
    this.logger.log('Disconnecting Redis Client...');
    await this.redisClient.quit();
  }
}
