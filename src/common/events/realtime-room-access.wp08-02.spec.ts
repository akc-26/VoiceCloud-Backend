import { Repository } from 'typeorm';
import { SubscriptionStatus, TicketStatus, VerificationStatus } from '../enums';
import { SocketErrorCode } from './constants/socket-error-codes.enum';
import { RealtimeRoomStateService } from './services/realtime-room-state.service';
import { Room } from '../../modules/rooms/entities/room.entity';
import { ScheduledRoom } from '../../modules/rooms/entities/scheduled-room.entity';
import { RoomTicket } from '../../modules/rooms/entities/room-ticket.entity';
import { User } from '../../modules/users/entities/user.entity';
import { CreatorSubscription } from '../../modules/users/entities/creator-subscription.entity';
import { ClubMember } from '../../modules/clubs/entities/club-member.entity';
import { RoomLifecycleStatus } from '../../modules/rooms/enums/room-lifecycle-status.enum';

describe('Realtime room access rules WP08-02', () => {
  const liveRoom = (overrides: Partial<Room> = {}): Room =>
    ({
      id: 'room-1',
      hostId: 'host-1',
      title: 'Protected room',
      description: '',
      category: 'General',
      status: RoomLifecycleStatus.LIVE,
      isLive: true,
      isLocked: false,
      isPremium: false,
      isTicketRequired: false,
      isSubscriberOnly: false,
      isInviteOnly: false,
      isVerifiedOnly: false,
      listenerCount: 0,
      speakerCount: 1,
      ...overrides,
    }) as Room;

  const makeService = (
    room: Room,
    options: {
      scheduled?: Partial<Repository<ScheduledRoom>>;
      tickets?: Partial<Repository<RoomTicket>>;
      users?: Partial<Repository<User>>;
      subscriptions?: Partial<Repository<CreatorSubscription>>;
      capacity?: number;
      clubMembers?: Partial<Repository<ClubMember>>;
    } = {},
  ) => {
    const roomRepository = {
      findOne: jest.fn().mockResolvedValue(room),
      save: jest.fn(async (value) => value),
    } as unknown as Repository<Room>;
    const moduleRef = options.capacity
      ? {
          get: jest.fn().mockReturnValue({
            getOperationalSettings: jest
              .fn()
              .mockResolvedValue({ maxRoomCapacity: options.capacity }),
          }),
        }
      : undefined;

    return new RealtimeRoomStateService(
      roomRepository,
      undefined,
      options.scheduled as Repository<ScheduledRoom> | undefined,
      options.tickets as Repository<RoomTicket> | undefined,
      options.users as Repository<User> | undefined,
      options.subscriptions as Repository<CreatorSubscription> | undefined,
      moduleRef as never,
      options.clubMembers as Repository<ClubMember> | undefined,
    );
  };

  it('allows the Host to join every protected room they own', async () => {
    const room = liveRoom({
      isLocked: true,
      isPremium: true,
      isSubscriberOnly: true,
      isInviteOnly: true,
      isVerifiedOnly: true,
    });
    const service = makeService(room);

    await expect(service.assertRoomJoinable(room.id, room.hostId)).resolves.toBe(
      room,
    );
  });

  it('requires and honours a Host-issued audience invitation', async () => {
    const room = liveRoom({ isInviteOnly: true });
    const service = makeService(room);

    await expect(
      service.assertRoomJoinable(room.id, 'listener-1'),
    ).rejects.toEqual(
      expect.objectContaining({ code: SocketErrorCode.INVITATION_REQUIRED }),
    );

    await service.inviteAudienceParticipant(
      room.id,
      room.hostId,
      'listener-1',
    );
    await expect(
      service.assertRoomJoinable(room.id, 'listener-1'),
    ).resolves.toBe(room);
  });

  it('allows an existing participant to remain while the room is locked', async () => {
    const room = liveRoom({ isLocked: true });
    const service = makeService(room);
    await service.addParticipant(room.id, 'listener-1', 'socket-1');

    await expect(
      service.assertRoomJoinable(room.id, 'listener-1'),
    ).resolves.toBe(room);
    await expect(
      service.assertRoomJoinable(room.id, 'listener-2'),
    ).rejects.toEqual(
      expect.objectContaining({ code: SocketErrorCode.ROOM_LOCKED }),
    );
  });

  it('requires club membership for a club-only scheduled room', async () => {
    const room = liveRoom({
      scheduledRoomId: 'scheduled-1',
      clubId: 'club-1',
      isInviteOnly: true,
    });
    const scheduled = {
      findOne: jest.fn().mockResolvedValue({
        id: 'scheduled-1',
        clubId: 'club-1',
        visibility: 'CLUB_ONLY',
      }),
    };
    const clubMembers = { findOne: jest.fn().mockResolvedValue(null) };
    const service = makeService(room, { scheduled, clubMembers });

    await expect(
      service.assertRoomJoinable(room.id, 'listener-1'),
    ).rejects.toEqual(
      expect.objectContaining({
        code: SocketErrorCode.CLUB_MEMBERSHIP_REQUIRED,
      }),
    );

    clubMembers.findOne.mockResolvedValue({
      id: 'membership-1',
      clubId: 'club-1',
      userId: 'listener-1',
    });
    await expect(
      service.assertRoomJoinable(room.id, 'listener-1'),
    ).resolves.toBe(room);
  });

  it('requires a valid active ticket for paid rooms', async () => {
    const room = liveRoom({
      isPremium: true,
      scheduledRoomId: 'scheduled-1',
    });
    const tickets = {
      findOne: jest
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'ticket-1',
          scheduledRoomId: 'scheduled-1',
          userId: 'listener-1',
          isValid: true,
          status: TicketStatus.ACTIVE,
        }),
    };
    const service = makeService(room, { tickets });

    await expect(
      service.assertRoomJoinable(room.id, 'listener-1'),
    ).resolves.toBe(room);
    expect(tickets.findOne).toHaveBeenCalledTimes(2);
  });

  it('rejects subscriber-only access without an active unexpired subscription', async () => {
    const room = liveRoom({ isSubscriberOnly: true });
    const subscriptions = { findOne: jest.fn().mockResolvedValue(null) };
    const service = makeService(room, { subscriptions });

    await expect(
      service.assertRoomJoinable(room.id, 'listener-1'),
    ).rejects.toEqual(
      expect.objectContaining({ code: SocketErrorCode.SUBSCRIPTION_REQUIRED }),
    );

    subscriptions.findOne.mockResolvedValue({
      status: SubscriptionStatus.ACTIVE,
      expiresAt: new Date(Date.now() + 60_000),
    });
    await expect(
      service.assertRoomJoinable(room.id, 'listener-1'),
    ).resolves.toBe(room);
  });

  it('enforces verified-only room access', async () => {
    const room = liveRoom({ isVerifiedOnly: true });
    const users = {
      findOne: jest.fn().mockResolvedValue({
        id: 'listener-1',
        isVerified: false,
        verificationStatus: VerificationStatus.UNVERIFIED,
      }),
    };
    const service = makeService(room, { users });

    await expect(
      service.assertRoomJoinable(room.id, 'listener-1'),
    ).rejects.toEqual(
      expect.objectContaining({ code: SocketErrorCode.VERIFICATION_REQUIRED }),
    );

    users.findOne.mockResolvedValue({
      id: 'listener-1',
      isVerified: true,
      verificationStatus: VerificationStatus.VERIFIED,
    });
    await expect(
      service.assertRoomJoinable(room.id, 'listener-1'),
    ).resolves.toBe(room);
  });

  it('blocks a new participant when configured room capacity is reached', async () => {
    const room = liveRoom();
    const service = makeService(room, { capacity: 1 });
    await service.addParticipant(room.id, 'listener-1', 'socket-1');

    await expect(
      service.assertRoomJoinable(room.id, 'listener-2'),
    ).rejects.toEqual(
      expect.objectContaining({ code: SocketErrorCode.ROOM_FULL }),
    );

    await expect(
      service.assertRoomJoinable(room.id, 'listener-1'),
    ).resolves.toBe(room);
  });
});
