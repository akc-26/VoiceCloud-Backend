import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import RedisMock from 'ioredis-mock';
import { REDIS_CLIENT } from './redis.constants';
import { RedisService } from './redis.service';
import { RedisStateService } from './redis-state.service';
import { assertRedisPingResponse } from './redis-response.util';
import { AppLogger } from '../common/logger/app-logger.service';
import {
  InfrastructureMode,
  requiresRealInfrastructure,
  resolveInfrastructureConnectTimeoutMs,
  resolveInfrastructureMode,
} from '../config/infrastructure-mode';

type TaggedRedisClient = Redis & {
  __voiceCloudInfrastructure?: 'redis' | 'ioredis-mock';
};

function createRedisMock(): TaggedRedisClient {
  const client = new RedisMock() as unknown as TaggedRedisClient;
  client.__voiceCloudInfrastructure = 'ioredis-mock';
  return client;
}

@Global()
@Module({
  providers: [
    AppLogger,
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService, AppLogger],
      useFactory: async (
        configService: ConfigService,
        logger: AppLogger,
      ): Promise<TaggedRedisClient> => {
        logger.setContext('RedisProvider');
        const host = configService.get<string>('REDIS_HOST', 'localhost');
        const port = configService.get<number>('REDIS_PORT', 6379);
        const mode = resolveInfrastructureMode();
        const timeoutMs = resolveInfrastructureConnectTimeoutMs();

        if (mode === InfrastructureMode.MEMORY) {
          logger.warn(
            'Using ioredis-mock (memory mode). This is not valid for production real-infrastructure operation.',
          );
          return createRedisMock();
        }

        const client = new Redis({
          host,
          port,
          lazyConnect: true,
          connectTimeout: timeoutMs,
          maxRetriesPerRequest: 3,
          retryStrategy(times) {
            if (times > 3) {
              return null;
            }
            return Math.min(times * 100, 2000);
          },
        }) as TaggedRedisClient;

        client.on('connect', () => {
          logger.log(`Redis connected successfully at ${host}:${port}`);
        });
        client.on('error', (error) => {
          logger.error(`Redis connection error: ${error.message}`);
        });

        try {
          await client.connect();
          const pong: unknown = await client.ping();
          assertRedisPingResponse(pong);
          client.__voiceCloudInfrastructure = 'redis';
          logger.log(`Using Redis at ${host}:${port} (${mode} mode).`);
          return client;
        } catch (error) {
          client.disconnect();
          const message =
            error instanceof Error ? error.message : String(error);
          if (requiresRealInfrastructure(mode)) {
            throw new Error(
              `Redis is required in real infrastructure mode but could not be reached at ${host}:${port}: ${message}`,
            );
          }
          logger.warn(
            `Redis is unavailable at ${host}:${port}; using explicit development ioredis-mock fallback. ${message}`,
          );
          return createRedisMock();
        }
      },
    },
    RedisService,
    RedisStateService,
  ],
  exports: [REDIS_CLIENT, RedisService, RedisStateService],
})
export class RedisModule {}
