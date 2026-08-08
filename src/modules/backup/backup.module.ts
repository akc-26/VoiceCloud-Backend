import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { BackupRecord } from './entities/backup-record.entity';
import { BackupSchedule } from './entities/backup-schedule.entity';
import { RestoreRecord } from './entities/restore-record.entity';
import { BackupController } from './backup.controller';
import { BackupService } from './backup.service';
import { RestoreService } from './restore.service';
import { BackupScheduleService } from './backup-schedule.service';
import { DisasterRecoveryService } from './disaster-recovery.service';
import { RedisModule } from '../../redis/redis.module';
import { EventsModule } from '../../common/events/events.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([BackupRecord, BackupSchedule, RestoreRecord]),
    ScheduleModule.forRoot(),
    RedisModule,
    EventsModule,
  ],
  controllers: [BackupController],
  providers: [
    BackupService,
    RestoreService,
    BackupScheduleService,
    DisasterRecoveryService,
  ],
  exports: [
    BackupService,
    RestoreService,
    BackupScheduleService,
    DisasterRecoveryService,
  ],
})
export class BackupModule {}
