import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, Between } from 'typeorm';
import { CreatorSubscription } from '../../modules/users/entities/creator-subscription.entity';
import { ScheduledRoom } from '../../modules/rooms/entities/scheduled-room.entity';
import { SubscriptionStatus, ScheduledRoomStatus } from '../../common/enums';
import { QueueService } from '../queue.service';
import { QUEUE_NAMES } from '../queue.constants';

@Injectable()
export class QueueSchedulerService {
  private readonly logger = new Logger(QueueSchedulerService.name);

  constructor(
    @InjectRepository(CreatorSubscription)
    private readonly subscriptionRepository: Repository<CreatorSubscription>,
    @InjectRepository(ScheduledRoom)
    private readonly scheduledRoomRepository: Repository<ScheduledRoom>,
    private readonly queueService: QueueService,
  ) {}

  /**
   * Scan for expired subscriptions hourly.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleSubscriptionExpiryScan() {
    this.logger.log('[Scheduler] Running subscription expiry scan...');
    try {
      const now = new Date();
      const expiredSubs = await this.subscriptionRepository.find({
        where: {
          status: SubscriptionStatus.ACTIVE,
          expiresAt: LessThanOrEqual(now),
        },
      });

      this.logger.log(`[Scheduler] Found ${expiredSubs.length} expired subscriptions.`);

      for (const sub of expiredSubs) {
        await this.queueService.addSubscriptionJob({
          subscriptionId: sub.id,
          action: 'expire',
          subscriberId: sub.subscriberId,
          creatorId: sub.creatorId,
        });
      }
    } catch (error: any) {
      this.logger.error(`[Scheduler Error] Subscription expiry scan failed: ${error.message}`);
    }
  }

  /**
   * Scan for upcoming scheduled rooms every minute to queue reminders.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async handleScheduledRoomReminderScan() {
    this.logger.log('[Scheduler] Running scheduled room reminder scan...');
    try {
      const now = new Date();
      const fifteenMinutesLater = new Date(now.getTime() + 15 * 60 * 1000);

      const upcomingRooms = await this.scheduledRoomRepository.find({
        where: {
          status: ScheduledRoomStatus.SCHEDULED,
          scheduledStartTime: Between(now, fifteenMinutesLater),
        },
      });

      this.logger.log(`[Scheduler] Found ${upcomingRooms.length} upcoming scheduled rooms.`);

      for (const room of upcomingRooms) {
        const diffMs = room.scheduledStartTime.getTime() - now.getTime();
        const minutesBefore = Math.max(1, Math.round(diffMs / 60000));

        await this.queueService.addReminderJob({
          scheduledRoomId: room.id,
          title: room.title,
          hostId: room.hostId,
          minutesBeforeStart: minutesBefore,
        });
      }
    } catch (error: any) {
      this.logger.error(`[Scheduler Error] Scheduled room reminder scan failed: ${error.message}`);
    }
  }

  /**
   * Periodic RTC cleanup scan every 5 minutes.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleRtcCleanupScan() {
    this.logger.log('[Scheduler] Running RTC cleanup scan...');
    try {
      // Enqueue a general RTC cleanup check
      await this.queueService.addRtcCleanupJob({
        action: 'cleanup_stale_room',
      });
    } catch (error: any) {
      this.logger.error(`[Scheduler Error] RTC cleanup scan failed: ${error.message}`);
    }
  }

  /**
   * Daily queue maintenance at midnight.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailyMaintenanceJobs() {
    this.logger.log('[Scheduler] Running daily queue maintenance jobs...');
    try {
      const queues = [
        QUEUE_NAMES.NOTIFICATION,
        QUEUE_NAMES.REMINDER,
        QUEUE_NAMES.SUBSCRIPTION,
        QUEUE_NAMES.PAYOUT,
        QUEUE_NAMES.RTC_CLEANUP,
      ];

      for (const qName of queues) {
        await this.queueService.cleanQueue(qName, 24 * 60 * 60 * 1000); // Clean completed/failed older than 24 hours
      }
      this.logger.log('[Scheduler] Daily queue maintenance completed.');
    } catch (error: any) {
      this.logger.error(`[Scheduler Error] Daily maintenance jobs failed: ${error.message}`);
    }
  }
}
