import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QUEUE_NAMES, JOB_TYPES } from '../queue.constants';
import { CreatorSubscription } from '../../modules/users/entities/creator-subscription.entity';
import { SubscriptionStatus } from '../../common/enums';
import { NotificationsService } from '../../modules/notifications/notifications.service';
import { NotificationType } from '../../modules/notifications/entities/notification.entity';

export interface SubscriptionJobData {
  subscriptionId: string;
  action: 'expire' | 'renewal_reminder';
  subscriberId?: string;
  creatorId?: string;
}

@Injectable()
@Processor(QUEUE_NAMES.SUBSCRIPTION)
export class SubscriptionProcessor extends WorkerHost {
  private readonly logger = new Logger(SubscriptionProcessor.name);

  constructor(
    @InjectRepository(CreatorSubscription)
    private readonly subscriptionRepository: Repository<CreatorSubscription>,
    private readonly notificationsService: NotificationsService,
  ) {
    super();
  }

  async process(job: Job<SubscriptionJobData, any, string>): Promise<any> {
    const startTime = Date.now();
    this.logger.log(
      `[SubscriptionProcessor] Processing job ${job.id} (${job.name}) - Action: ${job.data.action}`,
    );

    try {
      const { subscriptionId, action } = job.data;
      const subscription = await this.subscriptionRepository.findOne({
        where: { id: subscriptionId },
        relations: { creator: true, subscriber: true, plan: true },
      });

      if (!subscription) {
        this.logger.warn(
          `[SubscriptionProcessor] Subscription ${subscriptionId} not found. Skipping.`,
        );
        return { success: false, reason: 'SUBSCRIPTION_NOT_FOUND' };
      }

      if (action === 'expire') {
        if (subscription.status === SubscriptionStatus.ACTIVE) {
          subscription.status = SubscriptionStatus.EXPIRED;
          await this.subscriptionRepository.save(subscription);

          this.logger.log(
            `[SubscriptionProcessor] Subscription ${subscriptionId} status updated to EXPIRED.`,
          );

          // Send notification to subscriber
          try {
            await this.notificationsService.createNotification({
              userId: subscription.subscriberId,
              title: 'Creator Subscription Expired',
              message: `Your subscription to ${
                subscription.creator?.displayName || 'Creator'
              } (${subscription.plan?.title || 'Plan'}) has expired.`,
              type: NotificationType.SYSTEM,
              data: {
                subscriptionId: subscription.id,
                action: 'renew_subscription',
              },
            });
          } catch (err: any) {
            this.logger.warn(
              `[SubscriptionProcessor] Could not send expiry notification: ${err.message}`,
            );
          }
        }
      } else if (action === 'renewal_reminder') {
        try {
          await this.notificationsService.createNotification({
            userId: subscription.subscriberId,
            title: 'Subscription Renewal Reminder',
            message: `Your subscription to ${
              subscription.creator?.displayName || 'Creator'
            } will expire soon. Renew now to stay connected!`,
            type: NotificationType.SYSTEM,
            data: {
              subscriptionId: subscription.id,
              action: 'renew_subscription',
            },
          });
        } catch (err: any) {
          this.logger.warn(
            `[SubscriptionProcessor] Could not send renewal reminder: ${err.message}`,
          );
        }
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `[SubscriptionProcessor] Job ${job.id} completed in ${duration}ms.`,
      );

      return {
        success: true,
        subscriptionId,
        action,
        status: subscription.status,
        durationMs: duration,
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `[SubscriptionProcessor] Job ${job.id} failed after ${duration}ms: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
