import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { PresenceController } from './presence.controller';
import { SocialController } from './social.controller';
import { UsersService } from './users.service';
import { PresenceService } from './presence.service';
import { FollowsService } from './follows.service';
import { User } from './entities/user.entity';
import { UserSession } from './entities/user-session.entity';
import { UserDevice } from './entities/user-device.entity';
import { UserConnectionHistory } from './entities/user-connection-history.entity';
import { Follow } from './entities/follow.entity';
import { CreatorPlan } from './entities/creator-plan.entity';
import { CreatorSubscription } from './entities/creator-subscription.entity';
import { CreatorPayoutRequest } from './entities/creator-payout-request.entity';
import { BlockedUser } from '../moderation/entities/blocked-user.entity';
import { StorageModule } from '../storage/storage.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EventsModule } from '../../common/events/events.module';
import { RedisModule } from '../../redis/redis.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      UserSession,
      UserDevice,
      UserConnectionHistory,
      Follow,
      CreatorPlan,
      CreatorSubscription,
      CreatorPayoutRequest,
      BlockedUser,
    ]),
    StorageModule,
    NotificationsModule,
    EventsModule,
    RedisModule,
  ],
  controllers: [UsersController, PresenceController, SocialController],
  providers: [UsersService, PresenceService, FollowsService],
  exports: [UsersService, PresenceService, FollowsService],
})
export class UsersModule {}
