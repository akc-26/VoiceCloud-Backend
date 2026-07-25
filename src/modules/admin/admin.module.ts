import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SystemSetting } from './entities/system-setting.entity';
import { ProviderConfig } from './entities/provider-config.entity';
import { CmsPage } from './entities/cms-page.entity';
import { FeatureFlag } from './entities/feature-flag.entity';
import { AppVersion } from './entities/app-version.entity';
import { AuditLog } from './entities/audit-log.entity';

import { AdminSettingsService } from './admin-settings.service';
import { AdminProvidersService } from './admin-providers.service';
import { AdminCmsService } from './admin-cms.service';
import { AdminFeatureFlagsService } from './admin-feature-flags.service';
import { AdminVersionsService } from './admin-versions.service';
import { AdminAuditLogsService } from './admin-audit-logs.service';
import { AdminDashboardService } from './admin-dashboard.service';

import { PublicConfigController } from './public-config.controller';
import { PublicCmsController } from './public-cms.controller';
import { AdminController } from './admin.controller';

import { RedisModule } from '../../redis/redis.module';
import { EventsModule } from '../../common/events/events.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SystemSetting,
      ProviderConfig,
      CmsPage,
      FeatureFlag,
      AppVersion,
      AuditLog,
    ]),
    RedisModule,
    EventsModule,
  ],
  controllers: [PublicConfigController, PublicCmsController, AdminController],
  providers: [
    AdminSettingsService,
    AdminProvidersService,
    AdminCmsService,
    AdminFeatureFlagsService,
    AdminVersionsService,
    AdminAuditLogsService,
    AdminDashboardService,
  ],
  exports: [
    AdminSettingsService,
    AdminProvidersService,
    AdminCmsService,
    AdminFeatureFlagsService,
    AdminVersionsService,
    AdminAuditLogsService,
    AdminDashboardService,
  ],
})
export class AdminModule {}
