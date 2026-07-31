import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../queue.constants';

export interface HostEarningsJobData {
  hostProfileId?: string;
  userId?: string;
}

@Injectable()
@Processor(QUEUE_NAMES.HOST_EARNINGS)
export class HostEarningsProcessor extends WorkerHost {
  private readonly logger = new Logger(HostEarningsProcessor.name);

  async process(job: Job<HostEarningsJobData>): Promise<any> {
    this.logger.log(
      `[HostEarningsProcessor] Calculating host earnings for job ${job.id}`,
    );
    return { success: true, processedAt: new Date() };
  }
}
