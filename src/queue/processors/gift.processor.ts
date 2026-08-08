import { Processor, WorkerHost } from '@nestjs/bullmq';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES, JOB_TYPES } from '../queue.constants';
import { GiftSettlementService } from '../../modules/gifts/gift-settlement.service';

@Injectable()
@Processor(QUEUE_NAMES.GIFT)
export class GiftProcessor extends WorkerHost {
  private readonly logger = new Logger(GiftProcessor.name);

  constructor(private readonly giftSettlementService: GiftSettlementService) {
    super();
  }

  async process(job: Job): Promise<any> {
    this.logger.log(`Processing gift job ${job.name} (id: ${job.id})`);

    switch (job.name) {
      case JOB_TYPES.GIFT.SETTLEMENT_VERIFY:
        if (!job.data?.operationGroupId) {
          throw new BadRequestException(
            'Gift settlement verification requires operationGroupId',
          );
        }
        return this.giftSettlementService.verifyCommittedSettlement(
          job.data.operationGroupId,
        );
      case JOB_TYPES.GIFT.ANIMATION_DISPATCH:
        return this.handleAnimationDispatch(job.data);
      case JOB_TYPES.GIFT.COMBO_EXPIRATION:
        return this.handleComboExpiration(job.data);
      case JOB_TYPES.GIFT.SEASONAL_ACTIVATION:
        return this.handleSeasonalActivation(job.data);
      case JOB_TYPES.GIFT.SEASONAL_EXPIRATION:
        return this.handleSeasonalExpiration(job.data);
      case JOB_TYPES.GIFT.STATISTICS_AGGREGATION:
        return this.handleStatisticsAggregation(job.data);
      case JOB_TYPES.GIFT.CACHE_REFRESH:
        return this.handleCacheRefresh(job.data);
      default:
        throw new BadRequestException(`Unknown gift job type: ${job.name}`);
    }
  }

  private async handleAnimationDispatch(data: {
    queueId: string;
    roomId: string;
    giftId: string;
    animationUrl?: string;
  }) {
    this.logger.log(
      `Dispatching gift animation for queue ${data.queueId} in room ${data.roomId}`,
    );
    return { status: 'dispatched', queueId: data.queueId, roomId: data.roomId };
  }

  private async handleComboExpiration(data: {
    comboKey: string;
    roomId?: string;
    senderId?: string;
    giftId?: string;
  }) {
    this.logger.log(`Combo expired for key ${data.comboKey}`);
    return { status: 'expired', comboKey: data.comboKey };
  }

  private async handleSeasonalActivation(data: {
    giftId: string;
    seasonTag?: string;
  }) {
    this.logger.log(
      `Activated seasonal gift ${data.giftId} (${data.seasonTag})`,
    );
    return { status: 'activated', giftId: data.giftId };
  }

  private async handleSeasonalExpiration(data: {
    giftId: string;
    seasonTag?: string;
  }) {
    this.logger.log(`Expired seasonal gift ${data.giftId} (${data.seasonTag})`);
    return { status: 'expired', giftId: data.giftId };
  }

  private async handleStatisticsAggregation(data: { timeframe?: string }) {
    this.logger.log(
      `Aggregated gift statistics for timeframe ${data.timeframe || 'daily'}`,
    );
    return { status: 'aggregated', timeframe: data.timeframe || 'daily' };
  }

  private async handleCacheRefresh(data: { cacheKey?: string }) {
    this.logger.log(`Refreshed gift cache for ${data.cacheKey || 'all'}`);
    return { status: 'refreshed' };
  }
}
