import { UnauthorizedException } from '@nestjs/common';
import { Socket } from 'socket.io';
import { CreatorGateway } from '../socket/creator.gateway';
import { RealtimeRoomStateService } from '../common/events/services/realtime-room-state.service';
import { RealtimeSocketAuthService } from '../common/events/services/realtime-socket-auth.service';
import { RoomLifecycleStatus } from '../modules/rooms/enums/room-lifecycle-status.enum';
import { SocketErrorCode } from '../common/events/constants/socket-error-codes.enum';
import { EventsGateway } from '../common/events/events.gateway';
import { PresenceGateway } from '../common/events/gateways/presence.gateway';

describe('WP08-02 realtime security and moderation contract', () => {
  const createSocket = (overrides: Partial<Socket> = {}) =>
    ({
      id: 'socket-1',
      data: {},
      handshake: { headers: {}, auth: {}, query: {} },
      join: jest.fn().mockResolvedValue(undefined),
      leave: jest.fn().mockResolvedValue(undefined),
      emit: jest.fn(),
      disconnect: jest.fn(),
      ...overrides,
    }) as unknown as Socket;

  it('authenticates socket identity from the verified access token, not payload identity', async () => {
    const jwtTokenService = {
      verifyAccessToken: jest.fn().mockResolvedValue({
        sub: 'verified-user',
        userId: 'verified-user',
        creatorId: 'verified-creator',
        username: 'verified',
        role: 'CREATOR',
        jti: 'access-jti',
        type: 'access',
      }),
    };
    const moduleRef = { get: jest.fn().mockReturnValue(jwtTokenService) };
    const service = new RealtimeSocketAuthService(moduleRef as never);
    const socket = createSocket({
      handshake: {
        headers: {},
        auth: { token: 'signed-access-token', userId: 'spoofed-user' },
        query: { userId: 'spoofed-query-user' },
      } as never,
    });

    const user = await service.authenticate(socket);

    expect(jwtTokenService.verifyAccessToken).toHaveBeenCalledWith(
      'signed-access-token',
    );
    expect(user.userId).toBe('verified-user');
    expect(socket.data.user.userId).toBe('verified-user');
  });

  it('rejects a realtime connection without an access token', async () => {
    const service = new RealtimeSocketAuthService({ get: jest.fn() } as never);
    await expect(service.authenticate(createSocket())).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects realtime actions for a room the socket has not joined', () => {
    const service = new RealtimeSocketAuthService({ get: jest.fn() } as never);
    const socket = createSocket({
      data: {
        user: { userId: 'user-1' },
        joinedRoomIds: new Set(['room-a']),
      },
    });

    try {
      service.assertJoinedRoom(socket, 'room-b');
      throw new Error('Expected room membership validation to fail');
    } catch (error) {
      expect(error).toEqual(
        expect.objectContaining({ code: SocketErrorCode.NOT_IN_ROOM }),
      );
    }
  });

  it('prevents Creator sockets from subscribing to another creator logical room', async () => {
    const gateway = new CreatorGateway({} as never);
    const socket = createSocket({
      data: {
        user: {
          userId: 'user-1',
          creatorId: 'creator-1',
          role: 'CREATOR',
        },
      },
    });

    const denied = await gateway.handleJoinRoom(socket, {
      room: 'creator:creator-2',
    });
    const allowed = await gateway.handleJoinRoom(socket, {
      room: 'creator:creator-1',
    });

    expect(denied).toEqual(
      expect.objectContaining({
        success: false,
        error: 'ROOM_SUBSCRIPTION_FORBIDDEN',
      }),
    );
    expect(allowed).toEqual({ success: true, room: 'creator:creator-1' });
  });

  it('bans a participant and prevents them from rejoining until unbanned', async () => {
    const room = {
      id: 'room-live-1',
      hostId: 'host-1',
      title: 'Live room',
      description: '',
      category: 'General',
      status: RoomLifecycleStatus.LIVE,
      isLive: true,
      listenerCount: 0,
      speakerCount: 1,
    };
    const repository = {
      findOne: jest.fn().mockResolvedValue(room),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
    };
    const service = new RealtimeRoomStateService(repository as never);
    await service.getOrCreateRoomState(room.id, room.hostId);
    await service.addParticipant(room.id, 'listener-1', 'socket-listener');

    const banned = await service.banParticipant(
      room.id,
      room.hostId,
      'listener-1',
    );

    expect(banned.banned).toBe(true);
    await expect(
      service.assertRoomJoinable(room.id, 'listener-1'),
    ).rejects.toEqual(
      expect.objectContaining({ code: SocketErrorCode.ROOM_BANNED }),
    );

    await service.unbanParticipant(room.id, room.hostId, 'listener-1');
    await expect(
      service.assertRoomJoinable(room.id, 'listener-1'),
    ).resolves.toEqual(room);
  });

  it('does not allow a participant to ban the room host', async () => {
    const room = {
      id: 'room-live-2',
      hostId: 'host-2',
      title: 'Protected host room',
      description: '',
      category: 'General',
      status: RoomLifecycleStatus.LIVE,
      isLive: true,
      listenerCount: 1,
      speakerCount: 1,
    };
    const repository = {
      findOne: jest.fn().mockResolvedValue(room),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
    };
    const service = new RealtimeRoomStateService(repository as never);
    await service.getOrCreateRoomState(room.id, room.hostId);
    await service.addParticipant(room.id, 'listener-2', 'socket-listener');

    await expect(
      service.banParticipant(room.id, 'listener-2', room.hostId),
    ).rejects.toEqual(
      expect.objectContaining({ code: SocketErrorCode.NOT_MODERATOR }),
    );
  });

  it('does not allow a delegated moderator to demote or mute the room host', async () => {
    const room = {
      id: 'room-host-authority',
      hostId: 'host-authority',
      title: 'Host authority room',
      description: '',
      category: 'General',
      status: RoomLifecycleStatus.LIVE,
      isLive: true,
      listenerCount: 1,
      speakerCount: 1,
    };
    const repository = {
      findOne: jest.fn().mockResolvedValue(room),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
    };
    const service = new RealtimeRoomStateService(repository as never);
    const state = await service.getOrCreateRoomState(room.id, room.hostId);
    state.moderators.add('moderator-authority');

    await expect(
      service.demoteSpeaker(
        room.id,
        'moderator-authority',
        room.hostId,
      ),
    ).rejects.toEqual(
      expect.objectContaining({ code: SocketErrorCode.NOT_ROOM_OWNER }),
    );
    await expect(
      service.setMuteSpeaker(
        room.id,
        'moderator-authority',
        room.hostId,
        true,
      ),
    ).rejects.toEqual(
      expect.objectContaining({ code: SocketErrorCode.NOT_ROOM_OWNER }),
    );
  });


  it('does not leak room-targeted events to every connected realtime client', () => {
    const gateway = new EventsGateway({} as never, {} as never);
    const roomEmit = jest.fn();
    const globalEmit = jest.fn();
    gateway.server = {
      to: jest.fn().mockReturnValue({ emit: roomEmit }),
      emit: globalEmit,
    } as never;

    gateway.broadcastToRoom('room-private', 'room:event', { safe: true });

    expect(gateway.server.to).toHaveBeenCalledWith('room-private');
    expect(roomEmit).toHaveBeenCalledWith('room:event', { safe: true });
    expect(globalEmit).not.toHaveBeenCalled();
  });

  it('does not disclose private room participant counts to sockets outside the room', async () => {
    const roomStateService = {
      assertRoomJoinable: jest.fn().mockResolvedValue({ id: 'room-private' }),
      assertParticipantOrHost: jest.fn().mockResolvedValue(undefined),
      getParticipantCount: jest.fn().mockResolvedValue(7),
    };
    const socketAuthService = {
      getAuthenticatedUser: jest.fn().mockReturnValue({ userId: 'listener-1' }),
      assertJoinedRoom: jest.fn().mockImplementation(() => {
        throw {
          code: SocketErrorCode.NOT_IN_ROOM,
          message: 'Join the room before performing this action',
        };
      }),
    };
    const gateway = new PresenceGateway(
      roomStateService as never,
      socketAuthService as never,
    );
    const socket = createSocket();

    const result = await gateway.handleGetParticipantCount(socket, {
      roomId: 'room-private',
    });

    expect(result).toEqual(
      expect.objectContaining({
        success: false,
        error: SocketErrorCode.NOT_IN_ROOM,
      }),
    );
    expect(roomStateService.getParticipantCount).not.toHaveBeenCalled();
  });

  it('does not let a stale socket disconnect remove a newer reconnect', async () => {
    const room = {
      id: 'room-reconnect',
      hostId: 'host-reconnect',
      title: 'Reconnect room',
      description: '',
      category: 'General',
      status: RoomLifecycleStatus.LIVE,
      isLive: true,
      listenerCount: 1,
      speakerCount: 1,
    };
    const repository = {
      findOne: jest.fn().mockResolvedValue(room),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
    };
    const redis = {
      getRoomMeta: jest.fn().mockResolvedValue({
        roomId: room.id,
        hostId: room.hostId,
        title: room.title,
        description: room.description,
        category: room.category,
        isClosed: false,
      }),
      setRoomMeta: jest.fn(),
      getSpeakers: jest.fn().mockResolvedValue([]),
      setSpeaker: jest.fn().mockResolvedValue([]),
      getQueue: jest.fn().mockResolvedValue([]),
      getRoomParticipantsStrict: jest.fn().mockResolvedValue([
        {
          userId: 'listener-reconnect',
          socketId: 'socket-new',
          joinedAt: new Date().toISOString(),
          lastSeenAt: new Date().toISOString(),
        },
      ]),
      getRoomParticipantStrict: jest.fn().mockResolvedValue({
        userId: 'listener-reconnect',
        socketId: 'socket-new',
        joinedAt: new Date().toISOString(),
        lastSeenAt: new Date().toISOString(),
      }),
      removeUserPresence: jest.fn().mockResolvedValue(undefined),
      removeRoomParticipantStrict: jest.fn().mockResolvedValue(0),
      getParticipantCountStrict: jest.fn().mockResolvedValue(1),
    };
    const service = new RealtimeRoomStateService(
      repository as never,
      redis as never,
    );

    await service.getOrCreateRoomState(room.id, room.hostId);
    const result = await service.removeParticipant(
      room.id,
      'listener-reconnect',
      'socket-old',
    );

    expect(result.participantCount).toBe(1);
    expect(redis.removeRoomParticipantStrict).not.toHaveBeenCalled();
    expect(redis.getParticipantCountStrict).toHaveBeenCalledWith(room.id);
  });

});
