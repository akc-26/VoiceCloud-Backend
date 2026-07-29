import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CreatorPlan } from '../users/entities/creator-plan.entity';
import { CreatorSubscription } from '../users/entities/creator-subscription.entity';
import { CreatorPayoutRequest } from '../users/entities/creator-payout-request.entity';
import { User } from '../users/entities/user.entity';
import { WalletBalance } from '../wallet/entities/wallet-balance.entity';
import { CreatorService } from './creator.service';
import { CreatorController } from './creator.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CreatorPlan,
      CreatorSubscription,
      CreatorPayoutRequest,
      User,
      WalletBalance,
    ]),
  ],
  controllers: [CreatorController],
  providers: [CreatorService],
  exports: [CreatorService],
})
export class CreatorModule {}
