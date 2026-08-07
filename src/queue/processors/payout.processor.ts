import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES, JOB_TYPES } from '../queue.constants';
import { PayoutStatus } from '../../common/enums';
import { NotificationsService } from '../../modules/notifications/notifications.service';
import { CreatorPayoutLifecycleService } from '../../modules/wallet/creator-payout-lifecycle.service';
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
    private readonly payoutLifecycleService: CreatorPayoutLifecycleService,
    private readonly notificationsService: NotificationsService,
  ) {
    super();
  }

  async process(job: Job<PayoutJobData, any, string>): Promise<any> {
    const startTime = Date.now();
    const { payoutRequestId, targetStatus, reviewedBy, notes } = job.data;
    this.logger.log(
      `[PayoutProcessor] Processing job ${job.id} (${job.name}) - Payout ID: ${payoutRequestId}`,
    );

    try {
      let result;
      const nextStatus = targetStatus || PayoutStatus.PROCESSED;
      if (nextStatus === PayoutStatus.APPROVED) {
        if (!reviewedBy) {
          throw new Error('reviewedBy is required to approve a payout');
        }
        result = await this.payoutLifecycleService.approve(
          payoutRequestId,
          reviewedBy,
        );
      } else if (nextStatus === PayoutStatus.REJECTED) {
        if (!reviewedBy) {
          throw new Error('reviewedBy is required to reject a payout');
        }
        result = await this.payoutLifecycleService.reject(
          payoutRequestId,
          reviewedBy,
          notes,
        );
      } else if (nextStatus === PayoutStatus.PROCESSED) {
        result = await this.payoutLifecycleService.settle(
          payoutRequestId,
          reviewedBy,
        );
      } else {
        throw new Error(`Unsupported payout target status: ${nextStatus}`);
      }

      try {
        await this.notificationsService.createNotification({
          userId: result.payout.creatorId,
          title: 'Payout Request Updated',
          message: `Your payout request for ${result.payout.diamondAmount} diamonds ($${result.payout.payoutAmount}) has been updated to ${result.payout.status}.`,
          type: NotificationType.SYSTEM,
          data: {
            payoutRequestId: result.payout.id,
            status: result.payout.status,
            idempotent: result.idempotent,
          },
        });
      } catch (err: any) {
        this.logger.warn(
          `[PayoutProcessor] Could not persist creator payout notification: ${err.message}`,
        );
      }

      return {
        success: true,
        payoutRequestId,
        status: result.payout.status,
        idempotent: result.idempotent,
        durationMs: Date.now() - startTime,
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
