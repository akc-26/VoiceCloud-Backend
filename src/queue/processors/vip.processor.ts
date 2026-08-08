import { Processor, WorkerHost } from '@nestjs/bullmq';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
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
  rewardId?: string;
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
    const { action, userId, rewardId } = job.data;
    let result: any;

    switch (action) {
      case 'membership_expiration':
        result = await this.vipService.processMembershipExpirations();
        break;
      case 'renewal_reminder':
        result = userId
          ? await this.vipService.sendRenewalReminder(userId)
          : await this.vipService.processRenewalReminders();
        break;
      case 'benefit_cache_refresh':
        result = await this.vipService.refreshBenefitCaches();
        break;
      case 'reward_distribution':
        if (!userId || !rewardId) {
          throw new BadRequestException(
            'Queued VIP reward distribution requires userId and rewardId',
          );
        }
        result = await this.vipService.claimReward(userId, rewardId);
        break;
      case 'analytics_aggregation':
        result = await this.vipService.aggregateVipAnalytics();
        break;
      default:
        throw new BadRequestException(
          `Unknown VIP job action: ${String(action)}`,
        );
    }

    this.logger.log(
      `[VipProcessor] Job ${job.id} (${String(action)}) finished`,
    );
    return {
      success: true,
      action,
      durationMs: Date.now() - startTime,
      result,
    };
  }
}
