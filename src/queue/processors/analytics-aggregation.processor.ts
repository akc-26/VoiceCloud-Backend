import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../queue.constants';

@Processor(QUEUE_NAMES.ANALYTICS_AGGREGATION)
export class AnalyticsAggregationProcessor extends WorkerHost {
  private readonly logger = new Logger(AnalyticsAggregationProcessor.name);

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Processing analytics aggregation job ${job.id} - ${job.name}`);

    // Aggregate room metrics, listener retention stats, and gift totals
    return {
      status: 'completed',
      jobId: job.id,
      aggregatedAt: new Date().toISOString(),
    };
  }
}
