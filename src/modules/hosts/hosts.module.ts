import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HostProfile } from './entities/host-profile.entity';
import { HostAuditNote } from './entities/host-audit-note.entity';
import { HostEarnings } from './entities/host-earnings.entity';
import { HostPerformance } from './entities/host-performance.entity';
import { HostRoom } from './entities/host-room.entity';
import { HostIncidentLog } from './entities/host-incident-log.entity';
import { HostReward } from './entities/host-reward.entity';
import { HostVerificationAsset } from './entities/host-verification-asset.entity';
import { HostsService } from './hosts.service';
import { HostsController } from './hosts.controller';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      HostProfile,
      HostAuditNote,
      HostEarnings,
      HostPerformance,
      HostRoom,
      HostIncidentLog,
      HostReward,
      HostVerificationAsset,
    ]),
    StorageModule,
  ],
  controllers: [HostsController],
  providers: [HostsService],
  exports: [HostsService],
})
export class HostsModule {}
