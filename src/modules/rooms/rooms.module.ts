import { Module } from '@nestjs/common';
import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';
import { StorageModule } from '../storage/storage.module';
import { EventsModule } from '../../common/events/events.module';

@Module({
  imports: [StorageModule, EventsModule],
  controllers: [RoomsController],
  providers: [RoomsService],
  exports: [RoomsService],
})
export class RoomsModule {}
