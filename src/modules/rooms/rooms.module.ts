import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoomsController } from './rooms.controller';
import { ScheduledRoomsController } from './scheduled-rooms.controller';
import { RoomTicketsController } from './room-tickets.controller';
import { RoomsService } from './rooms.service';
import { ScheduledRoomsService } from './scheduled-rooms.service';
import { RoomTicketsService } from './room-tickets.service';
import { Room } from './entities/room.entity';
import { ScheduledRoom } from './entities/scheduled-room.entity';
import { RoomTicket } from './entities/room-ticket.entity';
import { Club } from '../clubs/entities/club.entity';
import { StorageModule } from '../storage/storage.module';
import { EventsModule } from '../../common/events/events.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Room, ScheduledRoom, RoomTicket, Club]),
    StorageModule,
    EventsModule,
  ],
  controllers: [RoomTicketsController, ScheduledRoomsController, RoomsController],
  providers: [RoomsService, ScheduledRoomsService, RoomTicketsService],
  exports: [RoomsService, ScheduledRoomsService, RoomTicketsService, TypeOrmModule],
})
export class RoomsModule {}
