import { Processor, WorkerHost } from '@nestjs/bullmq';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QUEUE_NAMES } from '../queue.constants';
import { FirebaseMessagingService } from '../firebase/firebase-messaging.service';
import { UserDevice } from '../../modules/users/entities/user-device.entity';
import { NotificationsService } from '../../modules/notifications/notifications.service';

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
  operationKey?: string;
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

    const data = job.data;
    const persisted = data.notificationId
      ? await this.notificationsService.getNotificationForDelivery(
          data.notificationId,
        )
      : null;

    if (data.userId && !persisted && !data.token && !data.tokens?.length) {
      throw new BadRequestException(
        'User-targeted notification jobs require a persisted notificationId',
      );
    }

    if (persisted?.deliveryStatus === 'SENT') {
      return {
        success: true,
        notificationId: persisted.id,
        idempotent: true,
        durationMs: Date.now() - startTime,
      };
    }

    try {
      if (persisted) {
        await this.notificationsService.markDeliveryAttempt(persisted.id);
      }

      const userId = persisted?.userId || data.userId;
      let targetTokens: string[] = [];
      if (data.token) {
        targetTokens = [data.token];
      } else if (data.tokens?.length) {
        targetTokens = data.tokens;
      } else if (userId) {
        const devices = await this.userDeviceRepository.find({
          where: { userId },
        });
        targetTokens = devices
          .map((device) => device.pushToken)
          .filter(
            (token): token is string => Boolean(token && token.trim().length),
          );
      }

      if (targetTokens.length === 0) {
        if (persisted) {
          await this.notificationsService.markDeliveryResult(
            persisted.id,
            'NO_DEVICE',
            'No valid push tokens found',
          );
        }
        return {
          success: false,
          reason: 'NO_TOKENS_FOUND',
          notificationId: persisted?.id,
          durationMs: Date.now() - startTime,
        };
      }

      const payload = {
        title: persisted?.title || data.title,
        body: persisted?.message || data.body,
        image: data.image,
        deepLink: data.deepLink,
        data: data.data,
      };
      const sendResult =
        targetTokens.length === 1
          ? await this.firebaseMessagingService.sendSingleNotification(
              targetTokens[0],
              payload,
            )
          : await this.firebaseMessagingService.sendMultiNotification(
              targetTokens,
              payload,
            );

      if (!sendResult.success) {
        const message = sendResult.error || 'Push provider reported a failure';
        if (persisted) {
          await this.notificationsService.markDeliveryResult(
            persisted.id,
            'FAILED',
            message,
          );
        }
        throw new Error(message);
      }

      if (persisted) {
        await this.notificationsService.markDeliveryResult(
          persisted.id,
          'SENT',
        );
      }

      return {
        success: true,
        tokenCount: targetTokens.length,
        notificationId: persisted?.id,
        idempotent: false,
        durationMs: Date.now() - startTime,
        sendResult,
      };
    } catch (error: any) {
      if (persisted) {
        try {
          await this.notificationsService.markDeliveryResult(
            persisted.id,
            'FAILED',
            error.message,
          );
        } catch {
          // Preserve the delivery failure as the BullMQ retry cause.
        }
      }
      this.logger.error(
        `[NotificationProcessor] Job ${job.id} failed after ${Date.now() - startTime}ms: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
