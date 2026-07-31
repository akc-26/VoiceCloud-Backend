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
        await this.dataSource.query('SELECT 1');
        dbStatus = 'connected';
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Database health check failed: ${msg}`);
    }

    // 2. Check Redis Connection
    try {
      const redisPong = await this.redisService.ping();
      if (redisPong) {
        redisStatus = 'connected';
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Redis health check failed: ${msg}`);
    }

    const overallStatus =
      dbStatus === 'connected' && redisStatus === 'connected' ? 'ok' : 'error';

    return {
      status: overallStatus,
      database: dbStatus,
      redis: redisStatus,
    };
  }

  async getOperationalMetrics() {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const uptime = process.uptime();

    let redisPingMs = 0;
    try {
      const start = Date.now();
      await this.redisService.ping();
      redisPingMs = Date.now() - start;
    } catch {
      redisPingMs = -1;
    }

    // System Alert Check
    const heapUsedMb = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    const heapTotalMb = Math.round(memoryUsage.heapTotal / 1024 / 1024);
    const memoryAlert =
      heapUsedMb > 1024 ? 'CRITICAL' : heapUsedMb > 512 ? 'WARNING' : 'HEALTHY';

    return {
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(uptime),
      process: {
        nodeVersion: process.version,
        pid: process.pid,
        cpuUsageUserMs: Math.round(cpuUsage.user / 1000),
        cpuUsageSystemMs: Math.round(cpuUsage.system / 1000),
      },
      memory: {
        heapUsedMb,
        heapTotalMb,
        rssMb: Math.round(memoryUsage.rss / 1024 / 1024),
        externalMb: Math.round(memoryUsage.external / 1024 / 1024),
        alertStatus: memoryAlert,
      },
      infrastructure: {
        databaseConnected: this.dataSource?.isInitialized ?? false,
        redisLatencyMs: redisPingMs,
      },
    };
  }
}
