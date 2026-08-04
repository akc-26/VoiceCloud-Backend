import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { CreatorPlan } from '../users/entities/creator-plan.entity';
import { CreatorSubscription } from '../users/entities/creator-subscription.entity';
import { CreatorPayoutRequest } from '../users/entities/creator-payout-request.entity';
import { User } from '../users/entities/user.entity';
import { WalletBalance } from '../wallet/entities/wallet-balance.entity';
import { CreatorStreamCredential } from './entities/creator-stream-credential.entity';
import { StreamKeyAuditLog } from './entities/stream-key-audit-log.entity';
import { CreatorService } from './creator.service';
import { CreatorController } from './creator.controller';
import { CreatorGateway } from '../../socket/creator.gateway';
import { SystemSettingsModule } from '../admin/system-settings/system-settings.module';

@Module({
  imports: [
    ConfigModule,
    SystemSettingsModule,
    TypeOrmModule.forFeature([
      CreatorPlan,
      CreatorSubscription,
      CreatorPayoutRequest,
      User,
      WalletBalance,
      CreatorStreamCredential,
      StreamKeyAuditLog,
    ]),
  ],
  controllers: [CreatorController],
  providers: [CreatorService, CreatorGateway],
  exports: [CreatorService, CreatorGateway],
})
export class CreatorModule {}
