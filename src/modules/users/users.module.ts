import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UsersService } from './users.service';
import { PresenceService } from './presence.service';
import { FollowsService } from './follows.service';
import { ProfileVisitorsService } from './visitors.service';
import { FriendsService } from './friends.service';
import { UserSettingsService } from './user-settings.service';
import { SocialIdentityService } from './social-identity.service';

import { UsersController } from './users.controller';
import { SocialController } from './social.controller';
import { PresenceController } from './presence.controller';
import { VisitorsController } from './visitors.controller';
import { FriendsController } from './friends.controller';
import { UserSettingsController } from './user-settings.controller';
import { SocialIdentityController } from './social-identity.controller';

import { User } from './entities/user.entity';
import { UserDevice } from './entities/user-device.entity';
import { UserSession } from './entities/user-session.entity';
import { UserConnectionHistory } from './entities/user-connection-history.entity';
import { Follow } from './entities/follow.entity';
import { CreatorSubscription } from './entities/creator-subscription.entity';
import { CreatorPayoutRequest } from './entities/creator-payout-request.entity';
import { CreatorPlan } from './entities/creator-plan.entity';
import { BlockedUser } from '../moderation/entities/blocked-user.entity';
import { ProfileVisitor } from './entities/profile-visitor.entity';
import { FriendRequest } from './entities/friend-request.entity';
import { UserFriend } from './entities/user-friend.entity';
import { UserSettings } from './entities/user-settings.entity';
import { Badge } from './entities/badge.entity';

import { StorageModule } from '../storage/storage.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      UserDevice,
      UserSession,
      UserConnectionHistory,
      Follow,
      CreatorSubscription,
      CreatorPayoutRequest,
      CreatorPlan,
      BlockedUser,
      ProfileVisitor,
      FriendRequest,
      UserFriend,
      UserSettings,
      Badge,
    ]),
    StorageModule,
    NotificationsModule,
  ],
  controllers: [
    UsersController,
    SocialController,
    PresenceController,
    VisitorsController,
    FriendsController,
    UserSettingsController,
    SocialIdentityController,
  ],
  providers: [
    UsersService,
    PresenceService,
    FollowsService,
    ProfileVisitorsService,
    FriendsService,
    UserSettingsService,
    SocialIdentityService,
  ],
  exports: [
    UsersService,
    PresenceService,
    FollowsService,
    ProfileVisitorsService,
    FriendsService,
    UserSettingsService,
    SocialIdentityService,
    TypeOrmModule,
  ],
})
export class UsersModule {}
