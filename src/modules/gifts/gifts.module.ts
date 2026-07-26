import { Module } from '@nestjs/common';
import { GiftsController } from './gifts.controller';
import { GiftsService } from './gifts.service';
import { StorageModule } from '../storage/storage.module';
import { EventsModule } from '../../common/events/events.module';

@Module({
  imports: [StorageModule, EventsModule],
  controllers: [GiftsController],
  providers: [GiftsService],
  exports: [GiftsService],
})
export class GiftsModule {}
