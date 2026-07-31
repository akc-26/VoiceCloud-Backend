import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QUEUE_NAMES, JOB_TYPES } from '../queue.constants';
import { ScheduledRoom } from '../../modules/rooms/entities/scheduled-room.entity';
import { NotificationsService } from '../../modules/notifications/notifications.service';
import { NotificationType } from '../../modules/notifications/entities/notification.entity';

export interface RoomReminderJobData {
  scheduledRoomId: string;
  title: string;
  hostId?: string;
  rsvpUserIds?: string[];
  minutesBeforeStart?: number;
  isCountdown?: boolean;
}

@Injectable()
@Processor(QUEUE_NAMES.REMINDER)
export class ReminderProcessor extends WorkerHost {
  private readonly logger = new Logger(ReminderProcessor.name);

  constructor(
    @InjectRepository(ScheduledRoom)
    private readonly scheduledRoomRepository: Repository<ScheduledRoom>,
    private readonly notificationsService: NotificationsService,
  ) {
    super();
  }

  async process(job: Job<RoomReminderJobData, any, string>): Promise<any> {
    const startTime = Date.now();
    this.logger.log(
      `[ReminderProcessor] Processing job ${job.id} (${job.name}) - Attempt ${job.attemptsMade + 1}`,
    );

    try {
      const data = job.data;
      const room = await this.scheduledRoomRepository.findOne({
        where: { id: data.scheduledRoomId },
        relations: { host: true },
      });

      if (!room) {
        this.logger.warn(
          `[ReminderProcessor] Scheduled room ${data.scheduledRoomId} not found. Removing reminder job.`,
        );
        return { success: false, reason: 'ROOM_NOT_FOUND' };
      }

      const minutes = data.minutesBeforeStart || 15;
      const title = data.isCountdown
        ? `Room Countdown: "${room.title}" starts in ${minutes}m!`
        : `Room Reminder: "${room.title}" is starting soon!`;
      const message = `Get ready! "${room.title}" hosted by ${
        room.host?.displayName || 'Host'
      } starts in ${minutes} minutes.`;

      const targetUserIds = new Set<string>();
      if (data.hostId || room.hostId) {
        targetUserIds.add(data.hostId || room.hostId);
      }
      if (data.rsvpUserIds) {
        data.rsvpUserIds.forEach((id) => targetUserIds.add(id));
      }

      let notifiedCount = 0;
      for (const userId of targetUserIds) {
        try {
          await this.notificationsService.createNotification({
            userId,
            title,
            message,
            type: NotificationType.SYSTEM,
            data: {
              scheduledRoomId: room.id,
              action: 'open_scheduled_room',
            },
          });
          notifiedCount++;
        } catch (err: any) {
          this.logger.warn(
            `[ReminderProcessor] Failed to notify user ${userId}: ${err.message}`,
          );
        }
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `[ReminderProcessor] Job ${job.id} completed in ${duration}ms. Notified ${notifiedCount} users.`,
      );

      return {
        success: true,
        notifiedCount,
        durationMs: duration,
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `[ReminderProcessor] Job ${job.id} failed after ${duration}ms: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
