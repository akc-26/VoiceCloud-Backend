import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoomAnalyticsService } from './room-analytics.service';
import { AnalyticsController } from './analytics.controller';
import { Room } from '../rooms/entities/room.entity';
import { RedisModule } from '../../redis/redis.module';

@Module({
  imports: [TypeOrmModule.forFeature([Room]), RedisModule],
  controllers: [AnalyticsController],
  providers: [RoomAnalyticsService],
  exports: [RoomAnalyticsService],
})
export class AnalyticsModule {}
