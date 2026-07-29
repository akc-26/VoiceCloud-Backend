import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { RedisModule } from '../../redis/redis.module';
import { AppLogger } from '../../common/logger/app-logger.service';

@Module({
  imports: [RedisModule],
  controllers: [HealthController],
  providers: [HealthService, AppLogger],
})
export class HealthModule {}
