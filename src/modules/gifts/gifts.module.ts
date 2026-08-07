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
import { WalletModule } from '../wallet/wallet.module';
import { GiftSettlementService } from './gift-settlement.service';

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
    WalletModule,
  ],
  controllers: [GiftsPhase18Controller, GiftsController],
  providers: [
    GiftsService,
    GiftingEngineService,
    GiftSettlementService,
    GiftAnalyticsService,
    MultiGiftingService,
    LuckyBoxService,
  ],
  exports: [
    GiftsService,
    GiftingEngineService,
    GiftSettlementService,
    GiftAnalyticsService,
    MultiGiftingService,
    LuckyBoxService,
  ],
})
export class GiftsModule {}
