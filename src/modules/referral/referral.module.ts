import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  ReferralCode,
  ReferralRelationship,
  ReferralCampaign,
  ReferralReward,
  ReferralMilestone,
  UserReferralMilestone,
  ReferralFraudLog,
  ReferralBlacklist,
} from './entities';
import {
  ReferralService,
  ReferralCampaignService,
  ReferralFraudService,
  ReferralAnalyticsService,
} from './services';
import {
  ReferralController,
  AdminReferralController,
} from './controllers';
import { RedisModule } from '../../redis/redis.module';
import { EventsModule } from '../../common/events/events.module';
import { WalletModule } from '../wallet/wallet.module';
import { VipModule } from '../vip/vip.module';
import { StoreModule } from '../store/store.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ReferralCode,
      ReferralRelationship,
      ReferralCampaign,
      ReferralReward,
      ReferralMilestone,
      UserReferralMilestone,
      ReferralFraudLog,
      ReferralBlacklist,
    ]),
    RedisModule,
    EventsModule,
    forwardRef(() => WalletModule),
    forwardRef(() => VipModule),
    forwardRef(() => StoreModule),
  ],
  controllers: [ReferralController, AdminReferralController],
  providers: [
    ReferralService,
    ReferralCampaignService,
    ReferralFraudService,
    ReferralAnalyticsService,
  ],
  exports: [
    ReferralService,
    ReferralCampaignService,
    ReferralFraudService,
    ReferralAnalyticsService,
  ],
})
export class ReferralModule {}
