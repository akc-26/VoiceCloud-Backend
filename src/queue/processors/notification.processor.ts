import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { QUEUE_NAMES, JOB_TYPES } from '../queue.constants';
import { FirebaseMessagingService } from '../firebase/firebase-messaging.service';
import { UserDevice } from '../../modules/users/entities/user-device.entity';
import { NotificationsService } from '../../modules/notifications/notifications.service';
import {
  NotificationType,
  Notification,
} from '../../modules/notifications/entities/notification.entity';

export interface SendPushJobData {
  userId?: string;
  token?: string;
  tokens?: string[];
  title: string;
  body: string;
  type?: string;
  image?: string;
  deepLink?: string;
  data?: Record<string, string>;
  notificationId?: string;
}

@Injectable()
@Processor(QUEUE_NAMES.NOTIFICATION)
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    private readonly firebaseMessagingService: FirebaseMessagingService,
    private readonly notificationsService: NotificationsService,
    @InjectRepository(UserDevice)
    private readonly userDeviceRepository: Repository<UserDevice>,
  ) {
    super();
  }

  async process(job: Job<SendPushJobData, any, string>): Promise<any> {
    const startTime = Date.now();
    this.logger.log(
      `[NotificationProcessor] Processing job ${job.id} (${job.name}) - Attempt ${job.attemptsMade + 1}`,
    );

    try {
      const data = job.data;
      let targetTokens: string[] = [];

      if (data.token) {
        targetTokens.push(data.token);
      } else if (data.tokens && data.tokens.length > 0) {
        targetTokens.push(...data.tokens);
      } else if (data.userId) {
        const devices = await this.userDeviceRepository.find({
          where: { userId: data.userId },
        });
        targetTokens = devices
          .map((d) => d.pushToken)
          .filter((t): t is string => Boolean(t && t.trim().length > 0));
      }

      if (targetTokens.length === 0) {
        this.logger.warn(
          `[NotificationProcessor] No valid push tokens found for job ${job.id}`,
        );
        return { success: false, reason: 'NO_TOKENS_FOUND' };
      }

      // If notificationId is not provided, create notification record in DB if userId is present
      if (data.userId && !data.notificationId) {
        try {
          await this.notificationsService.createNotification({
            userId: data.userId,
            title: data.title,
            message: data.body,
            type: (data.type as NotificationType) || NotificationType.SYSTEM,
            data: data.data || {},
          });
        } catch (err: any) {
          this.logger.warn(
            `[NotificationProcessor] DB notification save notice: ${err.message}`,
          );
        }
      }

      const payload = {
        title: data.title,
        body: data.body,
        image: data.image,
        deepLink: data.deepLink,
        data: data.data,
      };

      let sendResult;
      if (targetTokens.length === 1) {
        sendResult = await this.firebaseMessagingService.sendSingleNotification(
          targetTokens[0],
          payload,
        );
      } else {
        sendResult = await this.firebaseMessagingService.sendMultiNotification(
          targetTokens,
          payload,
        );
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `[NotificationProcessor] Job ${job.id} completed in ${duration}ms. Result: ${JSON.stringify(sendResult)}`,
      );

      return {
        success: sendResult.success,
        tokenCount: targetTokens.length,
        durationMs: duration,
        sendResult,
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `[NotificationProcessor] Job ${job.id} failed after ${duration}ms: ${error.message}`,
        error.stack,
      );
      throw error; // Let BullMQ retry according to backoff strategy
    }
  }
}
