import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProviderConfig } from './entities/provider-config.entity';
import { ProviderConfigHistory } from './entities/provider-config-history.entity';
import { CmsPage } from './entities/cms-page.entity';
import { FeatureFlag } from './entities/feature-flag.entity';
import { AppVersion } from './entities/app-version.entity';
import { User } from '../users/entities/user.entity';
import { Badge } from '../users/entities/badge.entity';
import { UserSettings } from '../users/entities/user-settings.entity';

import { AdminProvidersService } from './admin-providers.service';
import { ProviderTestConnectionService } from './provider-test-connection.service';
import { AdminCmsService } from './admin-cms.service';
import { AdminFeatureFlagsService } from './admin-feature-flags.service';
import { AdminVersionsService } from './admin-versions.service';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminUsersService } from './admin-users.service';

import { PublicConfigController } from './public-config.controller';
import { PublicCmsController } from './public-cms.controller';
import { AdminController } from './admin.controller';

import { RedisModule } from '../../redis/redis.module';
import { EventsModule } from '../../common/events/events.module';
import { CommonModule } from '../../common/common.module';
import { UsersModule } from '../users/users.module';
import { ChatModule } from '../chat/chat.module';
import { SystemSettingsModule } from './system-settings/system-settings.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProviderConfig,
      ProviderConfigHistory,
      CmsPage,
      FeatureFlag,
      AppVersion,
      User,
      Badge,
      UserSettings,
    ]),
    RedisModule,
    EventsModule,
    CommonModule,
    UsersModule,
    ChatModule,
    SystemSettingsModule,
  ],
  controllers: [PublicConfigController, PublicCmsController, AdminController],
  providers: [
    AdminProvidersService,
    ProviderTestConnectionService,
    AdminCmsService,
    AdminFeatureFlagsService,
    AdminVersionsService,
    AdminDashboardService,
    AdminUsersService,
  ],
  exports: [
    SystemSettingsModule,
    AdminProvidersService,
    ProviderTestConnectionService,
    AdminCmsService,
    AdminFeatureFlagsService,
    AdminVersionsService,
    AdminDashboardService,
    AdminUsersService,
  ],
})
export class AdminModule {}
