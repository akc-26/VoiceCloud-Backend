import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Agency } from './entities/agency.entity';
import { AgencyMember } from './entities/agency-member.entity';
import { AgencyInvitation } from './entities/agency-invitation.entity';
import { AgencyApplication } from './entities/agency-application.entity';
import { AgencyContract } from './entities/agency-contract.entity';
import { AgencySettlement } from './entities/agency-settlement.entity';
import { AgencyReward } from './entities/agency-reward.entity';
import { AgencyAuditLog } from './entities/agency-audit-log.entity';

import { AgenciesService } from './agencies.service';
import { AgenciesController } from './agencies.controller';
import { StorageModule } from '../storage/storage.module';
import { RedisModule } from '../../redis/redis.module';
import { EventsModule } from '../../common/events/events.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Agency,
      AgencyMember,
      AgencyInvitation,
      AgencyApplication,
      AgencyContract,
      AgencySettlement,
      AgencyReward,
      AgencyAuditLog,
    ]),
    StorageModule,
    RedisModule,
    EventsModule,
  ],
  controllers: [AgenciesController],
  providers: [AgenciesService],
  exports: [AgenciesService],
})
export class AgenciesModule {}
