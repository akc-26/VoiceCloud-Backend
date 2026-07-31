import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Gift } from './entities/gift.entity';
import { GiftCategory } from './entities/gift-category.entity';
import { GiftTransaction } from './entities/gift-transaction.entity';
import { GiftQueueItem } from './entities/gift-queue-item.entity';
import { GiftsController } from './gifts.controller';
import { GiftsPhase18Controller } from './gifts-phase18.controller';
import { GiftsService } from './gifts.service';
import { GiftingEngineService } from './gifting-engine.service';
import { GiftAnalyticsService } from './gift-analytics.service';
import { MultiGiftingService } from './multi-gifting.service';
import { LuckyBoxService } from './lucky-box.service';
import { StorageModule } from '../storage/storage.module';
import { EventsModule } from '../../common/events/events.module';
import { RedisModule } from '../../redis/redis.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Gift,
      GiftCategory,
      GiftTransaction,
      GiftQueueItem,
    ]),
    StorageModule,
    EventsModule,
    RedisModule,
  ],
  controllers: [GiftsPhase18Controller, GiftsController],
  providers: [
    GiftsService,
    GiftingEngineService,
    GiftAnalyticsService,
    MultiGiftingService,
    LuckyBoxService,
  ],
  exports: [
    GiftsService,
    GiftingEngineService,
    GiftAnalyticsService,
    MultiGiftingService,
    LuckyBoxService,
  ],
})
export class GiftsModule {}
