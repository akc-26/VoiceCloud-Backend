import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import RedisMock from 'ioredis-mock';
import { REDIS_CLIENT } from '../../redis/redis.constants';
import { RedisStateService } from '../../redis/redis-state.service';
import { RealtimeSocketAuthService } from './services/realtime-socket-auth.service';
import { REDIS_KEYS, DEFAULT_TTLS } from '../../redis/redis-keys.constant';
import { RealtimeRoomStateService } from './services/realtime-room-state.service';
import { Room } from '../../modules/rooms/entities/room.entity';
import { RoomGateway } from './gateways/room.gateway';
import { PresenceGateway } from './gateways/presence.gateway';
import { ReactionsGateway } from './gateways/reactions.gateway';
import { SocketErrorCode } from './constants/socket-error-codes.enum';

describe('Phase 3B - Redis Integration & Distributed State', () => {
  let testingModule: TestingModule;
  let redisClient: any;
  let redisStateService: RedisStateService;
  let roomStateService: RealtimeRoomStateService;
  let roomGateway: RoomGateway;
  let presenceGateway: PresenceGateway;
  let reactionsGateway: ReactionsGateway;

  const mockRoomRepo = {
    findOne: jest.fn().mockResolvedValue({
      id: 'room-101',
      hostId: 'host-1',
      title: 'Voice Room 101',
      description: 'Test Room Description',
      category: 'Music',
      status: 'live',
    }),
    save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
  };

  const mockSocketAuthService = {
    getAuthenticatedUser: (client: any) => client.data.user,
    assertJoinedRoom: (client: any, roomId: string) => {
      const joined = client.data.joinedRoomIds as Set<string>;
      if (!joined?.has(roomId)) {
        throw { code: SocketErrorCode.NOT_IN_ROOM, message: 'Not in room' };
      }
    },
  };

  const createMockSocket = (userId: string, socketId: string) =>
    ({
      id: socketId,
      data: {
        user: { userId },
        joinedRoomIds: new Set(['room-101', 'room-202', 'room-303']),
      },
      handshake: { auth: { userId }, query: {} },
      join: jest.fn().mockResolvedValue(undefined),
      leave: jest.fn().mockResolvedValue(undefined),
    }) as any;

  const createMockServer = () => {
    const emit = jest.fn();
    const to = jest.fn().mockReturnValue({ emit });
    return { to, emit };
  };

  beforeAll(async () => {
    redisClient = new RedisMock();

    testingModule = await Test.createTestingModule({
      providers: [
        {
          provide: REDIS_CLIENT,
          useValue: redisClient,
        },
        RedisStateService,
        RealtimeRoomStateService,
        RoomGateway,
        PresenceGateway,
        ReactionsGateway,
        {
          provide: RealtimeSocketAuthService,
          useValue: mockSocketAuthService,
        },
        {
          provide: getRepositoryToken(Room),
          useValue: mockRoomRepo,
        },
      ],
    }).compile();

    await testingModule.init();

    redisStateService = testingModule.get<RedisStateService>(RedisStateService);
    roomStateService = testingModule.get<RealtimeRoomStateService>(
      RealtimeRoomStateService,
    );
    roomGateway = testingModule.get<RoomGateway>(RoomGateway);
    presenceGateway = testingModule.get<PresenceGateway>(PresenceGateway);
    reactionsGateway = testingModule.get<ReactionsGateway>(ReactionsGateway);
  });

  beforeEach(async () => {
    await redisClient.flushall();

    roomGateway.server = createMockServer() as any;
    presenceGateway.server = createMockServer() as any;
    reactionsGateway.server = createMockServer() as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await redisClient.flushall();
    await testingModule.close();
    await redisClient.quit();
    redisClient.removeAllListeners();
  });

  describe('1. Redis Infrastructure & Key Strategy', () => {
    it('should pass health check when Redis is active', async () => {
      const isHealthy = await redisStateService.isHealthy();
      expect(isHealthy).toBe(true);
    });

    it('should follow key namespace strategy', () => {
      expect(REDIS_KEYS.USER_PRESENCE('u1')).toBe('vc:user:u1:presence');
      expect(REDIS_KEYS.USER_SOCKETS('u1')).toBe('vc:user:u1:sockets');
      expect(REDIS_KEYS.ROOM_META('r1')).toBe('vc:room:r1:meta');
      expect(REDIS_KEYS.ROOM_BANNED_USERS('r1')).toBe('vc:room:r1:banned');
      expect(REDIS_KEYS.ROOM_AUDIENCE_INVITES('r1')).toBe(
        'vc:room:r1:audience-invites',
      );
      expect(REDIS_KEYS.ROOM_QUEUE('r1')).toBe('vc:room:r1:queue');
      expect(REDIS_KEYS.ROOM_SPEAKERS('r1')).toBe('vc:room:r1:speakers');
      expect(REDIS_KEYS.ROOM_PARTICIPANTS('r1')).toBe(
        'vc:room:r1:participants',
      );
      expect(REDIS_KEYS.ROOM_INVITATIONS('r1')).toBe('vc:room:r1:invitations');
      expect(REDIS_KEYS.ROOM_TYPING('r1')).toBe('vc:room:r1:typing');
    });

    it('should define TTL constants correctly', () => {
      expect(DEFAULT_TTLS.PRESENCE_SECONDS).toBe(120);
      expect(DEFAULT_TTLS.TYPING_SECONDS).toBe(10);
      expect(DEFAULT_TTLS.INVITATION_SECONDS).toBe(300);
      expect(DEFAULT_TTLS.ROOM_STATE_SECONDS).toBe(86400);
    });
  });

  describe('2. Distributed Presence Synchronization', () => {
    it('should store and retrieve user presence in Redis', async () => {
      await redisStateService.setUserPresence(
        'user-1',
        'socket-1',
        'room-101',
        'Alice',
        'android',
      );

      const presence = await redisStateService.getUserPresence('user-1');
      expect(presence).not.toBeNull();
      expect(presence?.userId).toBe('user-1');
      expect(presence?.socketId).toBe('socket-1');
      expect(presence?.roomId).toBe('room-101');
      expect(presence?.username).toBe('Alice');
      expect(presence?.online).toBe(true);
    });

    it('should update lastSeen on heartbeat', async () => {
      await redisStateService.setUserPresence('user-1', 'socket-1', 'room-101');
      const firstPresence = await redisStateService.getUserPresence('user-1');

      await new Promise((resolve) => setTimeout(resolve, 10));
      await redisStateService.updateHeartbeat('user-1', 'room-101');

      const secondPresence = await redisStateService.getUserPresence('user-1');
      expect(secondPresence?.lastSeen).not.toBe(firstPresence?.lastSeen);
    });

    it('should set online to false when last socket disconnects', async () => {
      await redisStateService.setUserPresence('user-1', 'socket-1', 'room-101');
      await redisStateService.removeUserPresence(
        'user-1',
        'socket-1',
        'room-101',
      );

      const presence = await redisStateService.getUserPresence('user-1');
      expect(presence?.online).toBe(false);
    });
  });

  describe('3. Distributed Room State', () => {
    it('should initialize and retrieve room metadata from Redis', async () => {
      await redisStateService.setRoomMeta('room-101', {
        hostId: 'host-1',
        title: 'Voice Tech Talk',
        description: 'Discussing Redis & WebSockets',
        category: 'Technology',
        isClosed: false,
      });

      const meta = await redisStateService.getRoomMeta('room-101');
      expect(meta?.roomId).toBe('room-101');
      expect(meta?.hostId).toBe('host-1');
      expect(meta?.title).toBe('Voice Tech Talk');
      expect(meta?.category).toBe('Technology');
    });

    it('should manage stage speakers in Redis', async () => {
      const speaker = {
        userId: 'speaker-1',
        username: 'Bob',
        isMuted: false,
        role: 'speaker' as const,
        joinedStageAt: new Date().toISOString(),
      };

      await redisStateService.setSpeaker('room-101', speaker);
      const isSpeaker = await redisStateService.isSpeaker(
        'room-101',
        'speaker-1',
      );
      expect(isSpeaker).toBe(true);

      const speakers = await redisStateService.getSpeakers('room-101');
      expect(speakers.length).toBe(1);
      expect(speakers[0].userId).toBe('speaker-1');

      await redisStateService.removeSpeaker('room-101', 'speaker-1');
      const updatedSpeakers = await redisStateService.getSpeakers('room-101');
      expect(updatedSpeakers.length).toBe(0);
    });

    it('should manage room participants and counts', async () => {
      const p1 = {
        userId: 'u1',
        username: 'User 1',
        socketId: 's1',
        joinedAt: new Date().toISOString(),
        lastSeenAt: new Date().toISOString(),
      };

      await redisStateService.addRoomParticipant('room-101', p1);
      const count = await redisStateService.getParticipantCount('room-101');
      expect(count).toBe(1);

      const participants =
        await redisStateService.getRoomParticipants('room-101');
      expect(participants[0].userId).toBe('u1');

      await redisStateService.removeRoomParticipant('room-101', 'u1');
      const newCount = await redisStateService.getParticipantCount('room-101');
      expect(newCount).toBe(0);
    });

    it('should use strict participant operations without masking Redis errors', async () => {
      const participant = {
        userId: 'strict-user',
        username: 'Strict User',
        socketId: 'strict-socket',
        joinedAt: new Date().toISOString(),
        lastSeenAt: new Date().toISOString(),
      };

      await expect(
        redisStateService.addRoomParticipantStrict('room-101', participant),
      ).resolves.toBe(1);
      await expect(
        redisStateService.getRoomParticipantStrict('room-101', 'strict-user'),
      ).resolves.toEqual(participant);
      await expect(
        redisStateService.getParticipantCountStrict('room-101'),
      ).resolves.toBe(1);
      await expect(
        redisStateService.removeRoomParticipantStrict(
          'room-101',
          'strict-user',
        ),
      ).resolves.toBe(0);
    });

    it('should persist room bans and audience invitations in Redis', async () => {
      await redisStateService.banUserFromRoom('room-101', 'banned-user');
      await expect(
        redisStateService.isRoomBanned('room-101', 'banned-user'),
      ).resolves.toBe(true);

      await redisStateService.unbanUserFromRoom('room-101', 'banned-user');
      await expect(
        redisStateService.isRoomBanned('room-101', 'banned-user'),
      ).resolves.toBe(false);

      await redisStateService.inviteAudienceUser('room-101', 'invited-user');
      await expect(
        redisStateService.isAudienceInvited('room-101', 'invited-user'),
      ).resolves.toBe(true);

      await redisStateService.revokeAudienceInvitation(
        'room-101',
        'invited-user',
      );
      await expect(
        redisStateService.isAudienceInvited('room-101', 'invited-user'),
      ).resolves.toBe(false);
    });
  });

  describe('4. Speaker Queue Synchronization & Atomic Operations', () => {
    it('should atomically enqueue user into Redis speaker queue', async () => {
      const queueUser = {
        userId: 'user-q1',
        username: 'Queue User 1',
        joinedAt: new Date().toISOString(),
      };

      const res = await redisStateService.enqueueUser('room-101', queueUser);
      expect(res.position).toBe(1);
      expect(res.queue.length).toBe(1);
      expect(res.queue[0].userId).toBe('user-q1');
    });

    it('should prevent duplicate queue entries', async () => {
      const queueUser = {
        userId: 'user-q1',
        username: 'Queue User 1',
        joinedAt: new Date().toISOString(),
      };

      await redisStateService.enqueueUser('room-101', queueUser);
      await expect(
        redisStateService.enqueueUser('room-101', queueUser),
      ).rejects.toThrow('ALREADY_IN_QUEUE');
    });

    it('should dequeue user atomically', async () => {
      const q1 = {
        userId: 'u1',
        username: 'U1',
        joinedAt: new Date().toISOString(),
      };
      const q2 = {
        userId: 'u2',
        username: 'U2',
        joinedAt: new Date().toISOString(),
      };

      await redisStateService.enqueueUser('room-101', q1);
      await redisStateService.enqueueUser('room-101', q2);

      const res = await redisStateService.dequeueUser('room-101', 'u1');
      expect(res.queue.length).toBe(1);
      expect(res.queue[0].userId).toBe('u2');
    });

    it('should atomic reorder queue in Redis', async () => {
      const q1 = {
        userId: 'u1',
        username: 'U1',
        joinedAt: new Date().toISOString(),
      };
      const q2 = {
        userId: 'u2',
        username: 'U2',
        joinedAt: new Date().toISOString(),
      };
      const q3 = {
        userId: 'u3',
        username: 'U3',
        joinedAt: new Date().toISOString(),
      };

      await redisStateService.enqueueUser('room-101', q1);
      await redisStateService.enqueueUser('room-101', q2);
      await redisStateService.enqueueUser('room-101', q3);

      const res = await redisStateService.reorderQueue('room-101', [
        'u3',
        'u1',
        'u2',
      ]);
      expect(res.queue.map((item) => item.userId)).toEqual(['u3', 'u1', 'u2']);
    });
  });

  describe('5. Socket.IO Pub/Sub Broadcasts across Backends', () => {
    it('should publish and subscribe to Redis Pub/Sub events', async () => {
      const receivedEvents: any[] = [];
      const unsubscribe = redisStateService.subscribeToEvents(
        (event, payload) => {
          receivedEvents.push({ event, payload });
        },
      );

      await redisStateService.publishEvent(
        'emoji_reaction',
        { emoji: '🔥' },
        'room-101',
        'u1',
      );

      // Wait briefly for Redis Pub/Sub message delivery
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(receivedEvents.length).toBeGreaterThan(0);
      expect(receivedEvents[0].event).toBe('emoji_reaction');
      expect(receivedEvents[0].payload.payload.emoji).toBe('🔥');

      unsubscribe();
    });

    it('should propagate gift events via Pub/Sub through ReactionsGateway', async () => {
      const socket = createMockSocket('user-sender', 's1');
      await roomStateService.addParticipant('room-101', 'user-sender', 's1');
      const res = await reactionsGateway.handleSendGiftEvent(socket, {
        roomId: 'room-101',
        recipientId: 'user-receiver',
        giftId: 'gift-diamond',
        giftName: 'Diamond Star',
        coinValue: 500,
      });

      expect(res.success).toBe(true);
      expect(reactionsGateway.server.to).toHaveBeenCalledWith('room-101');
    });
  });

  describe('6. High Level RealtimeRoomStateService Integration with Redis', () => {
    it('should integrate joinQueue, leaveQueue, and updateTopic with Redis', async () => {
      const topicRes = await roomStateService.updateTopic(
        'room-202',
        'host-1',
        'New Title',
        'New Desc',
        'Tech',
      );
      expect(topicRes.title).toBe('New Title');

      const joinRes = await roomStateService.joinQueue(
        'room-202',
        'user-queue-1',
        'Audience 1',
      );
      expect(joinRes.position).toBe(1);

      const queueRes = await roomStateService.getQueue('room-202');
      expect(queueRes.count).toBe(1);

      const leaveRes = await roomStateService.leaveQueue(
        'room-202',
        'user-queue-1',
      );
      expect(leaveRes.queue.length).toBe(0);
    });

    it('should promote and demote speakers via RealtimeRoomStateService', async () => {
      await roomStateService.joinQueue('room-303', 'listener-1', 'Listener 1');
      const promoteRes = await roomStateService.promoteListener(
        'room-303',
        'host-1',
        'listener-1',
      );
      expect(promoteRes.speaker.userId).toBe('listener-1');

      const demoteRes = await roomStateService.demoteSpeaker(
        'room-303',
        'host-1',
        'listener-1',
      );
      expect(demoteRes.targetUserId).toBe('listener-1');
    });
  });

  describe('7. Failure Recovery Strategy', () => {
    it('should return graceful failures if Redis throws an error', async () => {
      jest
        .spyOn(redisClient, 'hgetall')
        .mockRejectedValueOnce(new Error('Redis connection drop'));

      const presence = await redisStateService.getUserPresence('user-1');
      expect(presence).toBeNull();
    });

    it('should clean up room state completely', async () => {
      await redisStateService.setRoomMeta('room-101', {
        hostId: 'h1',
        title: 'T',
        description: 'D',
        category: 'C',
        isClosed: false,
      });
      await redisStateService.cleanupRoomState('room-101');

      const meta = await redisStateService.getRoomMeta('room-101');
      expect(meta).toBeNull();
    });
  });
});
