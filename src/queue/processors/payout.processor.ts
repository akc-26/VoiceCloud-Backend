import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QUEUE_NAMES, JOB_TYPES } from '../queue.constants';
import { CreatorPayoutRequest } from '../../modules/users/entities/creator-payout-request.entity';
import { PayoutStatus } from '../../common/enums';
import { NotificationsService } from '../../modules/notifications/notifications.service';
import { NotificationType } from '../../modules/notifications/entities/notification.entity';

export interface PayoutJobData {
  payoutRequestId: string;
  targetStatus?: PayoutStatus;
  reviewedBy?: string;
  notes?: string;
}

@Injectable()
@Processor(QUEUE_NAMES.PAYOUT)
export class PayoutProcessor extends WorkerHost {
  private readonly logger = new Logger(PayoutProcessor.name);

  constructor(
    @InjectRepository(CreatorPayoutRequest)
    private readonly payoutRepository: Repository<CreatorPayoutRequest>,
    private readonly notificationsService: NotificationsService,
  ) {
    super();
  }

  async process(job: Job<PayoutJobData, any, string>): Promise<any> {
    const startTime = Date.now();
    this.logger.log(
      `[PayoutProcessor] Processing job ${job.id} (${job.name}) - Payout ID: ${job.data.payoutRequestId}`,
    );

    try {
      const { payoutRequestId, targetStatus, reviewedBy } = job.data;
      const payout = await this.payoutRepository.findOne({
        where: { id: payoutRequestId },
        relations: { creator: true },
      });

      if (!payout) {
        this.logger.warn(
          `[PayoutProcessor] Payout request ${payoutRequestId} not found. Skipping.`,
        );
        return { success: false, reason: 'PAYOUT_NOT_FOUND' };
      }

      const nextStatus = targetStatus || PayoutStatus.PROCESSED;
      payout.status = nextStatus;
      payout.reviewedAt = new Date();
      if (reviewedBy) {
        payout.reviewedBy = reviewedBy;
      }

      await this.payoutRepository.save(payout);

      this.logger.log(
        `[PayoutProcessor] Payout request ${payoutRequestId} successfully updated to ${nextStatus}`,
      );

      // Notify creator about payout status change
      try {
        await this.notificationsService.createNotification({
          userId: payout.creatorId,
          title: 'Payout Request Processed',
          message: `Your payout request for ${payout.diamondAmount} diamonds ($${payout.payoutAmount}) has been updated to ${nextStatus}.`,
          type: NotificationType.SYSTEM,
          data: {
            payoutRequestId: payout.id,
            status: nextStatus,
          },
        });
      } catch (err: any) {
        this.logger.warn(
          `[PayoutProcessor] Could not send creator payout notification: ${err.message}`,
        );
      }

      const duration = Date.now() - startTime;
      return {
        success: true,
        payoutRequestId,
        status: nextStatus,
        durationMs: duration,
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `[PayoutProcessor] Job ${job.id} failed after ${duration}ms: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
