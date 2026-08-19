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
import { WalletModule } from '../wallet/wallet.module';
import { VipFinancialAuthorityService } from './vip-financial-authority.service';

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
    WalletModule,
  ],
  controllers: [VipController],
  providers: [VipService, VipFinancialAuthorityService],
  exports: [VipService, VipFinancialAuthorityService],
})
export class VipModule {}
