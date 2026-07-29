import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QUEUE_NAMES, JOB_TYPES } from '../queue.constants';
import { RedisStateService } from '../../redis/redis-state.service';
import { ScheduledRoom } from '../../modules/rooms/entities/scheduled-room.entity';
import { ScheduledRoomStatus } from '../../common/enums';

export interface RtcCleanupJobData {
  roomId?: string;
  scheduledRoomId?: string;
  action:
    'cleanup_stale_room' | 'archive_scheduled_room' | 'cleanup_speaker_queue';
}

@Injectable()
@Processor(QUEUE_NAMES.RTC_CLEANUP)
export class RTCCleanupProcessor extends WorkerHost {
  private readonly logger = new Logger(RTCCleanupProcessor.name);

  constructor(
    private readonly redisStateService: RedisStateService,
    @InjectRepository(ScheduledRoom)
    private readonly scheduledRoomRepository: Repository<ScheduledRoom>,
  ) {
    super();
  }

  async process(job: Job<RtcCleanupJobData, any, string>): Promise<any> {
    const startTime = Date.now();
    this.logger.log(
      `[RTCCleanupProcessor] Processing job ${job.id} (${job.name}) - Action: ${job.data.action}`,
    );

    try {
      const { roomId, scheduledRoomId, action } = job.data;

      if (action === 'cleanup_stale_room' && roomId) {
        await this.redisStateService.cleanupRoomState(roomId);
        this.logger.log(
          `[RTCCleanupProcessor] Cleaned up Redis state for room ${roomId}`,
        );
      } else if (action === 'archive_scheduled_room' && scheduledRoomId) {
        const room = await this.scheduledRoomRepository.findOne({
          where: { id: scheduledRoomId },
        });

        if (room && room.status !== ScheduledRoomStatus.COMPLETED) {
          room.status = ScheduledRoomStatus.COMPLETED;
          await this.scheduledRoomRepository.save(room);
          this.logger.log(
            `[RTCCleanupProcessor] Archived completed scheduled room ${scheduledRoomId}`,
          );
        }
      } else if (action === 'cleanup_speaker_queue' && roomId) {
        const queue = await this.redisStateService.getQueue(roomId);
        if (queue && queue.length > 0) {
          await this.redisStateService.reorderQueue(roomId, []);
          this.logger.log(
            `[RTCCleanupProcessor] Cleared speaker queue for room ${roomId}`,
          );
        }
      }

      const duration = Date.now() - startTime;
      return {
        success: true,
        action,
        roomId,
        scheduledRoomId,
        durationMs: duration,
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `[RTCCleanupProcessor] Job ${job.id} failed after ${duration}ms: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
