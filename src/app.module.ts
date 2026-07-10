import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { validationSchema } from './config/validation.schema';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';
import { HealthModule } from './modules/health/health.module';
import { AppLogger } from './common/logger/app-logger.service';

// Phase 1B Modules Skeletons
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RoomsModule } from './modules/rooms/rooms.module';
import { ChatModule } from './modules/chat/chat.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { GiftsModule } from './modules/gifts/gifts.module';
import { VipModule } from './modules/vip/vip.module';
import { HostsModule } from './modules/hosts/hosts.module';
import { AgenciesModule } from './modules/agencies/agencies.module';
import { RankingsModule } from './modules/rankings/rankings.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
    }),
    DatabaseModule,
    RedisModule,
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
    RankingsModule,
    NotificationsModule,
  ],
  providers: [AppLogger],
})
export class AppModule {}
