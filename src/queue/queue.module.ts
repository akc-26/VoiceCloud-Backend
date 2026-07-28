import { Module } from '@nestjs/common';
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
import { QueueService } from './queue.service';
import { QueueSchedulerService } from './scheduler/queue-scheduler.service';
import { UserDevice } from '../modules/users/entities/user-device.entity';
import { Notification } from '../modules/notifications/entities/notification.entity';
import { ScheduledRoom } from '../modules/rooms/entities/scheduled-room.entity';
import { CreatorSubscription } from '../modules/users/entities/creator-subscription.entity';
import { CreatorPayoutRequest } from '../modules/users/entities/creator-payout-request.entity';
import { NotificationsModule } from '../modules/notifications/notifications.module';

@Module({
  imports: [
    NotificationsModule,
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
    QueueService,
    QueueSchedulerService,
  ],
  exports: [QueueService, FirebaseMessagingService, BullModule],
})
export class QueueModule {}
