import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import RedisMock from 'ioredis-mock';
import { REDIS_CLIENT } from './redis.constants';
import { RedisService } from './redis.service';
import { RedisStateService } from './redis-state.service';
import { AppLogger } from '../common/logger/app-logger.service';

@Global()
@Module({
  providers: [
    AppLogger,
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService, AppLogger],
      useFactory: (configService: ConfigService, logger: AppLogger) => {
        logger.setContext('RedisProvider');
        const host = configService.get<string>('REDIS_HOST');
        const port = configService.get<number>('REDIS_PORT');

        logger.log(`Initializing Redis client (${host || 'in-memory'})...`);

        if (!host || host === 'localhost' || host === '127.0.0.1') {
          return new RedisMock();
        }

        const client = new Redis({
          host,
          port,
          maxRetriesPerRequest: 3,
          retryStrategy(times) {
            if (times > 3) {
              logger.warn(`Redis reconnection failed after ${times} attempts`);
              return null; // stop retrying
            }
            return Math.min(times * 100, 2000);
          },
        });

        client.on('connect', () => {
          logger.log('Redis connected successfully');
        });

        client.on('error', (err) => {
          logger.error(`Redis connection error: ${err.message}`);
        });

        return client;
      },
    },
    RedisService,
    RedisStateService,
  ],
  exports: [REDIS_CLIENT, RedisService, RedisStateService],
})
export class RedisModule {}
