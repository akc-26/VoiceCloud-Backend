import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, LessThanOrEqual, Repository } from 'typeorm';
import { CreatorSubscription } from '../../modules/users/entities/creator-subscription.entity';
import { CreatorPayoutRequest } from '../../modules/users/entities/creator-payout-request.entity';
import { ScheduledRoom } from '../../modules/rooms/entities/scheduled-room.entity';
import { Notification } from '../../modules/notifications/entities/notification.entity';
import {
  PayoutStatus,
  ScheduledRoomStatus,
  SubscriptionStatus,
} from '../../common/enums';
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
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(CreatorPayoutRequest)
    private readonly payoutRepository: Repository<CreatorPayoutRequest>,
    private readonly queueService: QueueService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleSubscriptionExpiryScan() {
    this.logger.log('[Scheduler] Running subscription expiry scan...');
    try {
      const expiredSubs = await this.subscriptionRepository.find({
        where: {
          status: SubscriptionStatus.ACTIVE,
          expiresAt: LessThanOrEqual(new Date()),
        },
      });
      for (const sub of expiredSubs) {
        await this.queueService.addSubscriptionJob({
          subscriptionId: sub.id,
          action: 'expire',
          subscriberId: sub.subscriberId,
          creatorId: sub.creatorId,
        });
      }
    } catch (error: any) {
      this.logger.error(
        `[Scheduler Error] Subscription expiry scan failed: ${error.message}`,
      );
    }
  }

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
      for (const room of upcomingRooms) {
        const diffMs = room.scheduledStartTime.getTime() - now.getTime();
        await this.queueService.addReminderJob({
          scheduledRoomId: room.id,
          title: room.title,
          hostId: room.hostId,
          minutesBeforeStart: Math.max(1, Math.round(diffMs / 60000)),
        });
      }
    } catch (error: any) {
      this.logger.error(
        `[Scheduler Error] Scheduled room reminder scan failed: ${error.message}`,
      );
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async handlePendingNotificationDeliveryScan() {
    this.logger.log('[Scheduler] Running notification delivery scan...');
    try {
      const notifications = await this.notificationRepository.find({
        where: { deliveryStatus: In(['PENDING', 'FAILED']) },
        order: { createdAt: 'ASC' },
        take: 100,
      });
      for (const notification of notifications) {
        if (Number(notification.deliveryAttemptCount || 0) >= 5) continue;
        const rawData = notification.data || {};
        const data = Object.fromEntries(
          Object.entries(rawData).map(([key, value]) => [key, String(value)]),
        );
        await this.queueService.addNotificationJob({
          notificationId: notification.id,
          operationKey: notification.operationKey || undefined,
          userId: notification.userId,
          title: notification.title,
          body: notification.message,
          type: notification.type,
          data,
        });
      }
    } catch (error: any) {
      this.logger.error(
        `[Scheduler Error] Notification delivery scan failed: ${error.message}`,
      );
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handlePayoutReservationVerificationScan() {
    this.logger.log(
      '[Scheduler] Running payout reservation verification scan...',
    );
    try {
      const payouts = await this.payoutRepository.find({
        where: { status: In([PayoutStatus.PENDING, PayoutStatus.APPROVED]) },
        order: { createdAt: 'ASC' },
        take: 100,
      });
      for (const payout of payouts) {
        await this.queueService.addPayoutJob(
          {
            payoutRequestId: payout.id,
            action: 'verify_reservation',
          },
          { jobId: `payout-verify-${payout.id}` },
        );
      }
    } catch (error: any) {
      this.logger.error(
        `[Scheduler Error] Payout reservation verification scan failed: ${error.message}`,
      );
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleRtcCleanupScan() {
    this.logger.log('[Scheduler] Running RTC cleanup scan...');
    try {
      await this.queueService.addRtcCleanupJob({
        action: 'cleanup_stale_room',
      });
    } catch (error: any) {
      this.logger.error(
        `[Scheduler Error] RTC cleanup scan failed: ${error.message}`,
      );
    }
  }

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
      for (const queueName of queues) {
        await this.queueService.cleanQueue(queueName, 24 * 60 * 60 * 1000);
      }
    } catch (error: any) {
      this.logger.error(
        `[Scheduler Error] Daily maintenance jobs failed: ${error.message}`,
      );
    }
  }
}
