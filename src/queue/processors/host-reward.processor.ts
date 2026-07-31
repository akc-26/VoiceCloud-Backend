import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../queue.constants';

export interface HostRewardJobData {
  hostProfileId?: string;
  rewardId?: string;
}

@Injectable()
@Processor(QUEUE_NAMES.HOST_REWARDS)
export class HostRewardProcessor extends WorkerHost {
  private readonly logger = new Logger(HostRewardProcessor.name);

  async process(job: Job<HostRewardJobData>): Promise<any> {
    this.logger.log(
      `[HostRewardProcessor] Distributing host reward for job ${job.id}`,
    );
    return { success: true, processedAt: new Date() };
  }
}
