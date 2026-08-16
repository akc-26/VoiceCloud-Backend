import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoomsController } from './rooms.controller';
import { ScheduledRoomsController } from './scheduled-rooms.controller';
import { RoomTicketsController } from './room-tickets.controller';
import { SoundboardController } from './soundboard.controller';
import { RoomsService } from './rooms.service';
import { ScheduledRoomsService } from './scheduled-rooms.service';
import { RoomTicketsService } from './room-tickets.service';
import { SoundboardService } from './soundboard.service';
import { Room } from './entities/room.entity';
import { ScheduledRoom } from './entities/scheduled-room.entity';
import { RoomTicket } from './entities/room-ticket.entity';
import { Club } from '../clubs/entities/club.entity';
import { StorageModule } from '../storage/storage.module';
import { EventsModule } from '../../common/events/events.module';
import { RedisModule } from '../../redis/redis.module';
import { SystemSettingsModule } from '../admin/system-settings/system-settings.module';
import { RoomLifecycleService } from './room-lifecycle.service';
import { HostsModule } from '../hosts/hosts.module';
import { RoomAuthorityService } from './room-authority.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Room, ScheduledRoom, RoomTicket, Club]),
    StorageModule,
    EventsModule,
    RedisModule,
    SystemSettingsModule,
    HostsModule,
  ],
  controllers: [
    RoomTicketsController,
    ScheduledRoomsController,
    SoundboardController,
    RoomsController,
  ],
  providers: [
    RoomsService,
    ScheduledRoomsService,
    RoomTicketsService,
    SoundboardService,
    RoomLifecycleService,
    RoomAuthorityService,
  ],
  exports: [
    RoomsService,
    ScheduledRoomsService,
    RoomTicketsService,
    SoundboardService,
    RoomLifecycleService,
    RoomAuthorityService,
    TypeOrmModule,
  ],
})
export class RoomsModule {}
