import { Processor, WorkerHost } from '@nestjs/bullmq';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../queue.constants';
import { PayoutStatus } from '../../common/enums';
import { NotificationsService } from '../../modules/notifications/notifications.service';
import { CreatorPayoutLifecycleService } from '../../modules/wallet/creator-payout-lifecycle.service';
import { NotificationType } from '../../modules/notifications/entities/notification.entity';

export interface PayoutJobData {
  payoutRequestId: string;
  action?: 'verify_reservation';
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
    const { payoutRequestId, action, targetStatus, reviewedBy, notes } = job.data;
    if (!payoutRequestId) {
      throw new BadRequestException('payoutRequestId is required');
    }

    if (action === 'verify_reservation') {
      const verified = await this.payoutLifecycleService.verifyReservedPayout(
        payoutRequestId,
      );
      return {
        success: true,
        payoutRequestId,
        status: verified.payout.status,
        reservationTransactionId: verified.reservationTransaction.id,
        verificationOnly: true,
        durationMs: Date.now() - startTime,
      };
    }

    let result;
    const nextStatus = targetStatus || PayoutStatus.PROCESSED;
    if (nextStatus === PayoutStatus.APPROVED) {
      if (!reviewedBy) {
        throw new BadRequestException('reviewedBy is required to approve a payout');
      }
      result = await this.payoutLifecycleService.approve(
        payoutRequestId,
        reviewedBy,
      );
    } else if (nextStatus === PayoutStatus.REJECTED) {
      if (!reviewedBy) {
        throw new BadRequestException('reviewedBy is required to reject a payout');
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
      throw new BadRequestException(
        `Unsupported payout target status: ${nextStatus}`,
      );
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
        operationKey: `notification:payout:${result.payout.id}:${result.payout.status}`,
      });
    } catch (error: any) {
      this.logger.warn(
        `[PayoutProcessor] Could not persist creator payout notification: ${error.message}`,
      );
    }

    return {
      success: true,
      payoutRequestId,
      status: result.payout.status,
      idempotent: result.idempotent,
      durationMs: Date.now() - startTime,
    };
  }
}
