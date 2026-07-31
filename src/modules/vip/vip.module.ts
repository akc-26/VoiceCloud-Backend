import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  VipTier,
  VipMembership,
  VipBenefit,
  VipReward,
  VipRewardClaim,
  VipTransaction,
} from './entities';
import { Gift } from '../gifts/entities/gift.entity';
import { VipService } from './vip.service';
import { VipController } from './vip.controller';
import { RedisModule } from '../../redis/redis.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EventsModule } from '../../common/events/events.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      VipTier,
      VipMembership,
      VipBenefit,
      VipReward,
      VipRewardClaim,
      VipTransaction,
      Gift,
    ]),
    RedisModule,
    NotificationsModule,
    EventsModule,
  ],
  controllers: [VipController],
  providers: [VipService],
  exports: [VipService],
})
export class VipModule {}
