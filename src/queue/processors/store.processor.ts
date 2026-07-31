import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES, JOB_TYPES } from '../queue.constants';
import { StoreService } from '../../modules/store/store.service';

@Processor(QUEUE_NAMES.STORE)
export class StoreProcessor extends WorkerHost {
  private readonly logger = new Logger(StoreProcessor.name);

  constructor(private readonly storeService: StoreService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Processing Store Queue job: ${job.name} (ID: ${job.id})`);

    switch (job.name) {
      case JOB_TYPES.STORE.EXPIRE_INVENTORY_ITEMS:
        return this.handleExpireInventoryItems();
      case JOB_TYPES.STORE.CATALOG_CACHE_REFRESH:
        return this.handleCatalogCacheRefresh();
      default:
        this.logger.warn(`Unhandled Store Queue job type: ${job.name}`);
        return { status: 'skipped', jobName: job.name };
    }
  }

  private async handleExpireInventoryItems() {
    this.logger.log('Executing store inventory expiration sweep...');
    const result = await this.storeService.expireItemsProcessor();
    return { status: 'completed', ...result };
  }

  private async handleCatalogCacheRefresh() {
    this.logger.log('Refreshing store catalog cache...');
    return { status: 'completed', timestamp: new Date() };
  }
}
