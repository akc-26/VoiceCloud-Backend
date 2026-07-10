import { Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { RedisService } from '../../redis/redis.service';
import { AppLogger } from '../../common/logger/app-logger.service';

@Injectable()
export class HealthService {
  constructor(
    @Inject(DataSource) private readonly dataSource: DataSource,
    @Inject(RedisService) private readonly redisService: RedisService,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {
    this.logger.setContext('HealthService');
  }

  async checkHealth() {
    let dbStatus = 'disconnected';
    let redisStatus = 'disconnected';

    // 1. Check PostgreSQL Connection
    try {
      if (this.dataSource && this.dataSource.isInitialized) {
        // Run a simple select query to prove liveness
        await this.dataSource.query('SELECT 1');
        dbStatus = 'connected';
      }
    } catch (err) {
      this.logger.error(`Database health check failed: ${err.message}`);
    }

    // 2. Check Redis Connection
    try {
      const redisPong = await this.redisService.ping();
      if (redisPong) {
        redisStatus = 'connected';
      }
    } catch (err) {
      this.logger.error(`Redis health check failed: ${err.message}`);
    }

    const overallStatus = dbStatus === 'connected' && redisStatus === 'connected' ? 'ok' : 'error';

    return {
      status: overallStatus,
      database: dbStatus,
      redis: redisStatus,
    };
  }
}
