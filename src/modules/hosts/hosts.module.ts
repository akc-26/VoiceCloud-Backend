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
import { HostVerificationAssetService } from './host-verification-asset.service';
import { HostVerificationUploadInterceptor } from './interceptors/host-verification-upload.interceptor';
import { HostVerificationLegacyMigration } from './entities/host-verification-legacy-migration.entity';
import { LegacyHostVerificationMigrationService } from './legacy-host-verification-migration.service';
import { User } from '../users/entities/user.entity';
import { Room } from '../rooms/entities/room.entity';
import { ModerationAction } from '../moderation/entities/moderation-action.entity';
import { SystemSetting } from '../admin/entities/system-setting.entity';
import { HostEligibilityService } from './host-eligibility.service';
import { HostLevelConfigService } from './host-level-config.service';

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
      HostVerificationLegacyMigration,
      User,
      Room,
      ModerationAction,
      SystemSetting,
    ]),
    StorageModule,
  ],
  controllers: [HostsController],
  providers: [
    HostsService,
    HostVerificationAssetService,
    HostVerificationUploadInterceptor,
    LegacyHostVerificationMigrationService,
    HostEligibilityService,
    HostLevelConfigService,
  ],
  exports: [
    HostsService,
    HostVerificationAssetService,
    LegacyHostVerificationMigrationService,
    HostEligibilityService,
    HostLevelConfigService,
  ],
})
export class HostsModule {}
