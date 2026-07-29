import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../queue.constants';

export interface AgencyAnalyticsJobData {
  agencyId?: string;
}

@Injectable()
@Processor(QUEUE_NAMES.AGENCY_ANALYTICS)
export class AgencyAnalyticsProcessor extends WorkerHost {
  private readonly logger = new Logger(AgencyAnalyticsProcessor.name);

  async process(job: Job<AgencyAnalyticsJobData>): Promise<any> {
    this.logger.log(
      `[AgencyAnalyticsProcessor] Refreshing analytics for agency ${job.data.agencyId || 'ALL'}`,
    );
    return {
      success: true,
      agencyId: job.data.agencyId,
      processedAt: new Date(),
    };
  }
}
