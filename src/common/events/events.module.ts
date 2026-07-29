import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Room } from '../../modules/rooms/entities/room.entity';
import { EventsGateway } from './events.gateway';
import { RoomGateway } from './gateways/room.gateway';
import { PresenceGateway } from './gateways/presence.gateway';
import { ReactionsGateway } from './gateways/reactions.gateway';
import { RealtimeRoomStateService } from './services/realtime-room-state.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Room])],
  providers: [
    EventsGateway,
    RoomGateway,
    PresenceGateway,
    ReactionsGateway,
    RealtimeRoomStateService,
  ],
  exports: [
    EventsGateway,
    RoomGateway,
    PresenceGateway,
    ReactionsGateway,
    RealtimeRoomStateService,
  ],
})
export class EventsModule {}
