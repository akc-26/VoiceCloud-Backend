import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventsModule } from '../../../common/events/events.module';
import { RedisModule } from '../../../redis/redis.module';
import { AdminAuditLogsService } from '../admin-audit-logs.service';
import { AdminSettingsService } from '../admin-settings.service';
import { AuditLog } from '../entities/audit-log.entity';
import { SystemSetting } from '../entities/system-setting.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([SystemSetting, AuditLog]),
    RedisModule,
    EventsModule,
  ],
  providers: [AdminSettingsService, AdminAuditLogsService],
  exports: [AdminSettingsService, AdminAuditLogsService],
})
export class SystemSettingsModule {}
