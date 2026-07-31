import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../queue.constants';
import { VipService } from '../../modules/vip/vip.service';

export interface VipJobData {
  action:
    | 'membership_expiration'
    | 'renewal_reminder'
    | 'benefit_cache_refresh'
    | 'reward_distribution'
    | 'analytics_aggregation';
  membershipId?: string;
  userId?: string;
}

@Injectable()
@Processor(QUEUE_NAMES.VIP)
export class VipProcessor extends WorkerHost {
  private readonly logger = new Logger(VipProcessor.name);

  constructor(private readonly vipService: VipService) {
    super();
  }

  async process(job: Job<VipJobData, any, string>): Promise<any> {
    const startTime = Date.now();
    this.logger.log(
      `[VipProcessor] Processing VIP job ${job.id} (${job.name}) - Action: ${job.data.action}`,
    );

    try {
      const { action, membershipId, userId } = job.data;
      let result: any = { success: true };

      switch (action) {
        case 'membership_expiration':
          result = await this.vipService.processMembershipExpirations();
          break;
        case 'renewal_reminder':
          if (userId) {
            result = await this.vipService.sendRenewalReminder(userId);
          } else {
            result = await this.vipService.processRenewalReminders();
          }
          break;
        case 'benefit_cache_refresh':
          result = await this.vipService.refreshBenefitCaches();
          break;
        case 'reward_distribution':
          result = await this.vipService.processRewardDistributions();
          break;
        case 'analytics_aggregation':
          result = await this.vipService.aggregateVipAnalytics();
          break;
        default:
          this.logger.warn(
            `[VipProcessor] Unknown VIP job action: ${String(action)}`,
          );
          break;
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `[VipProcessor] Job ${job.id} (${String(action)}) finished in ${duration}ms`,
      );
      return { success: true, action, durationMs: duration, result };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `[VipProcessor] Job ${job.id} failed after ${duration}ms: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
