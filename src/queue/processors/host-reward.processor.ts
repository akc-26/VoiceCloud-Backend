import { Processor, WorkerHost } from '@nestjs/bullmq';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../queue.constants';
import { HostsService } from '../../modules/hosts/hosts.service';

export interface HostRewardJobData {
  hostProfileId?: string;
  userId?: string;
  rewardId?: string;
}

@Injectable()
@Processor(QUEUE_NAMES.HOST_REWARDS)
export class HostRewardProcessor extends WorkerHost {
  private readonly logger = new Logger(HostRewardProcessor.name);

  constructor(private readonly hostsService: HostsService) {
    super();
  }

  async process(job: Job<HostRewardJobData>): Promise<any> {
    if (!job.data.userId || !job.data.rewardId) {
      throw new BadRequestException(
        'Host reward recovery requires userId and rewardId',
      );
    }
    const reward = await this.hostsService.claimReward(
      job.data.userId,
      job.data.rewardId,
    );
    this.logger.log(
      `[HostRewardProcessor] Verified/distributed Host reward ${job.data.rewardId}`,
    );
    return { success: true, reward };
  }
}
