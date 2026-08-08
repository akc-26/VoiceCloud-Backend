import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Room } from '../../modules/rooms/entities/room.entity';
import { ScheduledRoom } from '../../modules/rooms/entities/scheduled-room.entity';
import { RoomTicket } from '../../modules/rooms/entities/room-ticket.entity';
import { User } from '../../modules/users/entities/user.entity';
import { CreatorSubscription } from '../../modules/users/entities/creator-subscription.entity';
import { ClubMember } from '../../modules/clubs/entities/club-member.entity';
import { EventsGateway } from './events.gateway';
import { RoomGateway } from './gateways/room.gateway';
import { PresenceGateway } from './gateways/presence.gateway';
import { ReactionsGateway } from './gateways/reactions.gateway';
import { RealtimeRoomStateService } from './services/realtime-room-state.service';
import { RealtimeSocketAuthService } from './services/realtime-socket-auth.service';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Room,
      ScheduledRoom,
      RoomTicket,
      User,
      CreatorSubscription,
      ClubMember,
    ]),
  ],
  providers: [
    EventsGateway,
    RoomGateway,
    PresenceGateway,
    ReactionsGateway,
    RealtimeRoomStateService,
    RealtimeSocketAuthService,
  ],
  exports: [
    EventsGateway,
    RoomGateway,
    PresenceGateway,
    ReactionsGateway,
    RealtimeRoomStateService,
    RealtimeSocketAuthService,
  ],
})
export class EventsModule {}
