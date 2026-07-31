import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../queue.constants';

@Processor(QUEUE_NAMES.REGIONAL_PRICING_CACHE_REFRESH)
export class RegionalPricingCacheRefreshProcessor extends WorkerHost {
  private readonly logger = new Logger(
    RegionalPricingCacheRefreshProcessor.name,
  );

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Refreshing regional pricing cache job ${job.id}`);

    return {
      status: 'completed',
      refreshedAt: new Date().toISOString(),
    };
  }
}
