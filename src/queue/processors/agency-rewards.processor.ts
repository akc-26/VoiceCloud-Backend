import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../queue.constants';

export interface AgencyRewardsJobData {
  agencyId?: string;
  rewardType?: string;
}

@Injectable()
@Processor(QUEUE_NAMES.AGENCY_REWARDS)
export class AgencyRewardsProcessor extends WorkerHost {
  private readonly logger = new Logger(AgencyRewardsProcessor.name);

  async process(job: Job<AgencyRewardsJobData>): Promise<any> {
    this.logger.log(
      `[AgencyRewardsProcessor] Distributing agency rewards for agency ${job.data.agencyId || 'ALL'}`,
    );
    return {
      success: true,
      agencyId: job.data.agencyId,
      processedAt: new Date(),
    };
  }
}
