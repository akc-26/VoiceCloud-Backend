import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../queue.constants';

export interface HostAnalyticsJobData {
  hostProfileId?: string;
}

@Injectable()
@Processor(QUEUE_NAMES.HOST_ANALYTICS)
export class HostAnalyticsProcessor extends WorkerHost {
  private readonly logger = new Logger(HostAnalyticsProcessor.name);

  async process(job: Job<HostAnalyticsJobData>): Promise<any> {
    this.logger.log(
      `[HostAnalyticsProcessor] Refreshing host analytics for job ${job.id}`,
    );
    return { success: true, processedAt: new Date() };
  }
}
