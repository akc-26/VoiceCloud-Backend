import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../queue.constants';

export interface HostPerformanceJobData {
  hostProfileId?: string;
  userId?: string;
}

@Injectable()
@Processor(QUEUE_NAMES.HOST_PERFORMANCE)
export class HostPerformanceProcessor extends WorkerHost {
  private readonly logger = new Logger(HostPerformanceProcessor.name);

  async process(job: Job<HostPerformanceJobData>): Promise<any> {
    this.logger.log(
      `[HostPerformanceProcessor] Aggregating host performance for job ${job.id}`,
    );
    return { success: true, processedAt: new Date() };
  }
}
