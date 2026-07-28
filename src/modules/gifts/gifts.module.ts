import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Gift } from './entities/gift.entity';
import { GiftTransaction } from './entities/gift-transaction.entity';
import { GiftsController } from './gifts.controller';
import { GiftsPhase18Controller } from './gifts-phase18.controller';
import { GiftsService } from './gifts.service';
import { MultiGiftingService } from './multi-gifting.service';
import { LuckyBoxService } from './lucky-box.service';
import { StorageModule } from '../storage/storage.module';
import { EventsModule } from '../../common/events/events.module';
import { RedisModule } from '../../redis/redis.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Gift, GiftTransaction]),
    StorageModule,
    EventsModule,
    RedisModule,
  ],
  controllers: [GiftsPhase18Controller, GiftsController],
  providers: [GiftsService, MultiGiftingService, LuckyBoxService],
  exports: [GiftsService, MultiGiftingService, LuckyBoxService],
})
export class GiftsModule {}
