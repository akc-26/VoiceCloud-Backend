import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QUEUE_NAMES } from './queue.constants';
import { FirebaseMessagingService } from './firebase/firebase-messaging.service';
import { NotificationProcessor } from './processors/notification.processor';
import { ReminderProcessor } from './processors/reminder.processor';
import { SubscriptionProcessor } from './processors/subscription.processor';
import { PayoutProcessor } from './processors/payout.processor';
import { RTCCleanupProcessor } from './processors/rtc-cleanup.processor';
import { AnalyticsAggregationProcessor } from './processors/analytics-aggregation.processor';
import { LeaderboardCalculationProcessor } from './processors/leaderboard-calculation.processor';
import { PollExpirationProcessor } from './processors/poll-expiration.processor';
import { QuizExpirationProcessor } from './processors/quiz-expiration.processor';
import { RegionalPricingCacheRefreshProcessor } from './processors/regional-pricing-cache-refresh.processor';
import { ChatProcessor } from './processors/chat.processor';
import { GiftProcessor } from './processors/gift.processor';
import { VipProcessor } from './processors/vip.processor';
import { HostPerformanceProcessor } from './processors/host-performance.processor';
import { HostEarningsProcessor } from './processors/host-earnings.processor';
import { HostRewardProcessor } from './processors/host-reward.processor';
import { HostVerificationProcessor } from './processors/host-verification.processor';
import { HostAnalyticsProcessor } from './processors/host-analytics.processor';
import { TasksProcessor } from './processors/tasks.processor';
import { StoreProcessor } from './processors/store.processor';
import { ReferralProcessor } from './processors/referral.processor';
import { QueueService } from './queue.service';
import { QueueSchedulerService } from './scheduler/queue-scheduler.service';
import { UserDevice } from '../modules/users/entities/user-device.entity';
import { Notification } from '../modules/notifications/entities/notification.entity';
import { ScheduledRoom } from '../modules/rooms/entities/scheduled-room.entity';
import { CreatorSubscription } from '../modules/users/entities/creator-subscription.entity';
import { CreatorPayoutRequest } from '../modules/users/entities/creator-payout-request.entity';
import { NotificationsModule } from '../modules/notifications/notifications.module';
import { VipModule } from '../modules/vip/vip.module';
import { RankingsModule } from '../modules/rankings/rankings.module';
import { TasksAchievementsModule } from '../modules/tasks-achievements/tasks-achievements.module';
import { StoreModule } from '../modules/store/store.module';
import { ReferralModule } from '../modules/referral/referral.module';

@Module({
  imports: [
    NotificationsModule,
    forwardRef(() => VipModule),
    forwardRef(() => RankingsModule),
    forwardRef(() => TasksAchievementsModule),
    forwardRef(() => StoreModule),
    forwardRef(() => ReferralModule),
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([
      UserDevice,
      Notification,
      ScheduledRoom,
      CreatorSubscription,
      CreatorPayoutRequest,
    ]),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const host = configService.get<string>('REDIS_HOST') || 'localhost';
        const port = configService.get<number>('REDIS_PORT') || 6379;
        return {
          connection: {
            host,
            port,
            maxRetriesPerRequest: null,
          },
        };
      },
    }),
    BullModule.registerQueue(
      { name: QUEUE_NAMES.NOTIFICATION },
      { name: QUEUE_NAMES.REMINDER },
      { name: QUEUE_NAMES.SUBSCRIPTION },
      { name: QUEUE_NAMES.PAYOUT },
      { name: QUEUE_NAMES.RTC_CLEANUP },
      { name: QUEUE_NAMES.ANALYTICS_AGGREGATION },
      { name: QUEUE_NAMES.LEADERBOARD_CALCULATION },
      { name: QUEUE_NAMES.POLL_EXPIRATION },
      { name: QUEUE_NAMES.QUIZ_EXPIRATION },
      { name: QUEUE_NAMES.REGIONAL_PRICING_CACHE_REFRESH },
      { name: QUEUE_NAMES.CHAT },
      { name: QUEUE_NAMES.GIFT },
      { name: QUEUE_NAMES.VIP },
      { name: QUEUE_NAMES.HOST_PERFORMANCE },
      { name: QUEUE_NAMES.HOST_EARNINGS },
      { name: QUEUE_NAMES.HOST_REWARDS },
      { name: QUEUE_NAMES.HOST_VERIFICATION },
      { name: QUEUE_NAMES.HOST_ANALYTICS },
      { name: QUEUE_NAMES.TASKS },
      { name: QUEUE_NAMES.STORE },
      { name: QUEUE_NAMES.REFERRAL },
    ),
  ],
  providers: [
    FirebaseMessagingService,
    NotificationProcessor,
    ReminderProcessor,
    SubscriptionProcessor,
    PayoutProcessor,
    RTCCleanupProcessor,
    AnalyticsAggregationProcessor,
    LeaderboardCalculationProcessor,
    PollExpirationProcessor,
    QuizExpirationProcessor,
    RegionalPricingCacheRefreshProcessor,
    ChatProcessor,
    GiftProcessor,
    VipProcessor,
    HostPerformanceProcessor,
    HostEarningsProcessor,
    HostRewardProcessor,
    HostVerificationProcessor,
    HostAnalyticsProcessor,
    TasksProcessor,
    StoreProcessor,
    ReferralProcessor,
    QueueService,
    QueueSchedulerService,
  ],
  exports: [QueueService, FirebaseMessagingService, BullModule],
})
export class QueueModule {}
