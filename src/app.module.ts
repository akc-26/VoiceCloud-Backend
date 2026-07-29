import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { validationSchema } from './config/validation.schema';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';
import { HealthModule } from './modules/health/health.module';
import { AppLogger } from './common/logger/app-logger.service';

// Phase 1B & Phase 7 Modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RoomsModule } from './modules/rooms/rooms.module';
import { ChatModule } from './modules/chat/chat.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { GiftsModule } from './modules/gifts/gifts.module';
import { VipModule } from './modules/vip/vip.module';
import { HostsModule } from './modules/hosts/hosts.module';
import { AgenciesModule } from './modules/agencies/agencies.module';
import { SearchModule } from './modules/search/search.module';
import { DiscoveryModule } from './modules/discovery/discovery.module';
import { RankingsModule } from './modules/rankings/rankings.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ModerationModule } from './modules/moderation/moderation.module';
import { AnnouncementsModule } from './modules/announcements/announcements.module';
import { StorageModule } from './modules/storage/storage.module';
import { RtcModule } from './modules/rtc/rtc.module';
import { AdminModule } from './modules/admin/admin.module';
import { BackupModule } from './modules/backup/backup.module';
import { ClubsModule } from './modules/clubs/clubs.module';
import { CreatorModule } from './modules/creator/creator.module';
import { AppConfigModule } from './modules/config/config.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { PollsModule } from './modules/polls/polls.module';
import { QuizzesModule } from './modules/quizzes/quizzes.module';
import { RegionalPricingModule } from './modules/regional-pricing/regional-pricing.module';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { EventsModule } from './common/events/events.module';
import { QueueModule } from './queue/queue.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
    }),
    DatabaseModule,
    RedisModule,
    EventsModule,
    QueueModule,
    HealthModule,
    AuthModule,
    UsersModule,
    RoomsModule,
    ChatModule,
    WalletModule,
    GiftsModule,
    VipModule,
    HostsModule,
    AgenciesModule,
    SearchModule,
    DiscoveryModule,
    RankingsModule,
    NotificationsModule,
    ModerationModule,
    AnnouncementsModule,
    StorageModule,
    RtcModule,
    AdminModule,
    BackupModule,
    ClubsModule,
    CreatorModule,
    AppConfigModule,
    AnalyticsModule,
    PollsModule,
    QuizzesModule,
    RegionalPricingModule,
  ],

  controllers: [AppController],
  providers: [AppService, AppLogger],
})
export class AppModule {}
