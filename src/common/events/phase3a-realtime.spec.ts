import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Server, Socket } from 'socket.io';
import { Room } from '../../modules/rooms/entities/room.entity';
import { RealtimeRoomStateService } from './services/realtime-room-state.service';
import { RoomGateway } from './gateways/room.gateway';
import { PresenceGateway } from './gateways/presence.gateway';
import { ReactionsGateway } from './gateways/reactions.gateway';
import { SocketErrorCode } from './constants/socket-error-codes.enum';
import { RealtimeSocketAuthService } from './services/realtime-socket-auth.service';

describe('Phase 3A - Socket.IO Real-Time Extensions', () => {
  let roomStateService: RealtimeRoomStateService;
  let roomGateway: RoomGateway;
  let presenceGateway: PresenceGateway;
  let reactionsGateway: ReactionsGateway;

  const mockRoomRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockServer = {
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
  } as unknown as Server;

  const mockSocketAuthService = {
    getAuthenticatedUser: (client: Socket) => client.data.user,
    assertJoinedRoom: (client: Socket, roomId: string) => {
      const joined = client.data.joinedRoomIds as Set<string>;
      if (!joined?.has(roomId)) {
        throw { code: SocketErrorCode.NOT_IN_ROOM, message: 'Not in room' };
      }
    },
  };

  const createMockSocket = (userId: string, socketId = 'sock-123') =>
    ({
      id: socketId,
      data: {
        user: { userId },
        joinedRoomIds: new Set([
          'room-queue-101',
          'room-stage-202',
          'room-reactions-303',
          'room-gifts-404',
          'room-topic-505',
          'room-presence-606',
          'room-101',
          'room-202',
          'room-303',
        ]),
      },
      handshake: { auth: { userId }, query: {}, headers: {} },
      join: jest.fn().mockReturnValue(Promise.resolve()),
      leave: jest.fn().mockReturnValue(Promise.resolve()),
      emit: jest.fn(),
    }) as unknown as Socket;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockRoomRepository.findOne.mockResolvedValue({
      id: 'generic-live-room',
      hostId: 'generic-host',
      title: 'Generic Live Room',
      description: '',
      category: 'General',
      status: 'live',
    });
    mockRoomRepository.save.mockImplementation((entity) =>
      Promise.resolve(entity),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
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
          useValue: mockRoomRepository,
        },
      ],
    }).compile();

    roomStateService = module.get<RealtimeRoomStateService>(
      RealtimeRoomStateService,
    );
    roomGateway = module.get<RoomGateway>(RoomGateway);
    presenceGateway = module.get<PresenceGateway>(PresenceGateway);
    reactionsGateway = module.get<ReactionsGateway>(ReactionsGateway);

    roomGateway.server = mockServer;
    presenceGateway.server = mockServer;
    reactionsGateway.server = mockServer;
  });

  describe('1. Speaker Queue', () => {
    const roomId = 'room-queue-101';
    const hostId = 'host-user-1';
    const listener1 = 'listener-user-1';
    const listener2 = 'listener-user-2';

    beforeEach(async () => {
      mockRoomRepository.findOne.mockResolvedValue({
        id: roomId,
        hostId,
        title: 'Tech Talk',
        status: 'live',
      });
      await roomStateService.getOrCreateRoomState(roomId, hostId);
      await roomStateService.addParticipant(roomId, listener1, 'sock-l1');
      await roomStateService.addParticipant(roomId, listener2, 'sock-l2');
    });

    it('should allow listeners to join queue and receive position', async () => {
      const socket = createMockSocket(listener1);
      const res = await roomGateway.handleJoinQueue(socket, {
        roomId,
        username: 'Alice',
      });

      expect(res.success).toBe(true);
      expect(res.position).toBe(1);
      expect(mockServer.to).toHaveBeenCalledWith(roomId);
      expect(mockServer.emit).toHaveBeenCalledWith(
        'speaker_queue_updated',
        expect.objectContaining({ roomId, count: 1 }),
      );
    });

    it('should reject joining queue if user is already in queue', async () => {
      const socket = createMockSocket(listener1);
      await roomGateway.handleJoinQueue(socket, { roomId });
      const res = await roomGateway.handleJoinQueue(socket, { roomId });

      expect(res.success).toBe(false);
      expect(res.error).toBe(SocketErrorCode.ALREADY_IN_QUEUE);
    });

    it('should reject joining queue if user is host/already on stage', async () => {
      const socket = createMockSocket(hostId);
      const res = await roomGateway.handleJoinQueue(socket, { roomId });

      expect(res.success).toBe(false);
      expect(res.error).toBe(SocketErrorCode.ALREADY_ON_STAGE);
    });

    it('should allow user to leave queue', async () => {
      const socket = createMockSocket(listener1);
      await roomGateway.handleJoinQueue(socket, { roomId });

      const res = await roomGateway.handleLeaveQueue(socket, { roomId });
      expect(res.success).toBe(true);
      expect(res.queue).toHaveLength(0);
    });

    it('should return NOT_IN_QUEUE if leaving non-joined queue', async () => {
      const socket = createMockSocket(listener1);
      const res = await roomGateway.handleLeaveQueue(socket, { roomId });

      expect(res.success).toBe(false);
      expect(res.error).toBe(SocketErrorCode.NOT_IN_QUEUE);
    });

    it('should allow viewing current queue', async () => {
      const socket1 = createMockSocket(listener1);
      const socket2 = createMockSocket(listener2);
      await roomGateway.handleJoinQueue(socket1, { roomId, username: 'Alice' });
      await roomGateway.handleJoinQueue(socket2, { roomId, username: 'Bob' });

      const viewRes = await roomGateway.handleViewQueue(socket1, { roomId });
      expect(viewRes.success).toBe(true);
      expect(viewRes.count).toBe(2);
    });

    it('should allow host to reorder queue', async () => {
      const socket1 = createMockSocket(listener1);
      const socket2 = createMockSocket(listener2);
      const hostSocket = createMockSocket(hostId);

      await roomGateway.handleJoinQueue(socket1, { roomId });
      await roomGateway.handleJoinQueue(socket2, { roomId });

      const reorderRes = await roomGateway.handleReorderQueue(hostSocket, {
        roomId,
        orderedUserIds: [listener2, listener1],
      });

      expect(reorderRes.success).toBe(true);
      expect(reorderRes.queue[0].userId).toBe(listener2);
    });

    it('should reject queue reordering from non-host/moderator', async () => {
      const socket1 = createMockSocket(listener1);
      const reorderRes = await roomGateway.handleReorderQueue(socket1, {
        roomId,
        orderedUserIds: [listener1],
      });

      expect(reorderRes.success).toBe(false);
      expect(reorderRes.error).toBe(SocketErrorCode.NOT_MODERATOR);
    });
  });

  describe('2. Stage Management', () => {
    const roomId = 'room-stage-202';
    const hostId = 'host-user-2';
    const listenerId = 'listener-user-3';

    beforeEach(async () => {
      mockRoomRepository.findOne.mockResolvedValue({
        id: roomId,
        hostId,
        status: 'live',
      });
      await roomStateService.getOrCreateRoomState(roomId, hostId);
      await roomStateService.addParticipant(roomId, listenerId, 'sock-stage');
    });

    it('should allow host to invite listener to stage', async () => {
      const hostSocket = createMockSocket(hostId);
      const res = await roomGateway.handleInviteSpeaker(hostSocket, {
        roomId,
        targetUserId: listenerId,
      });

      expect(res.success).toBe(true);
      expect(res.targetUserId).toBe(listenerId);
      expect(mockServer.emit).toHaveBeenCalledWith(
        'speaker_invitation_sent',
        expect.objectContaining({ roomId, targetUserId: listenerId }),
      );
    });

    it('should allow invited listener to accept invitation and join stage', async () => {
      const hostSocket = createMockSocket(hostId);
      const listenerSocket = createMockSocket(listenerId);

      await roomGateway.handleInviteSpeaker(hostSocket, {
        roomId,
        targetUserId: listenerId,
      });
      const res = await roomGateway.handleAcceptInvitation(listenerSocket, {
        roomId,
      });

      expect(res.success).toBe(true);
      expect(res.speaker.userId).toBe(listenerId);
      expect(mockServer.emit).toHaveBeenCalledWith(
        'speaker_promoted',
        expect.anything(),
      );
    });

    it('should allow invited listener to reject invitation', async () => {
      const hostSocket = createMockSocket(hostId);
      const listenerSocket = createMockSocket(listenerId);

      await roomGateway.handleInviteSpeaker(hostSocket, {
        roomId,
        targetUserId: listenerId,
      });
      const res = await roomGateway.handleRejectInvitation(listenerSocket, {
        roomId,
      });

      expect(res.success).toBe(true);
      expect(mockServer.emit).toHaveBeenCalledWith(
        'speaker_invitation_rejected',
        expect.anything(),
      );
    });

    it('should allow host to directly promote listener to speaker', async () => {
      const hostSocket = createMockSocket(hostId);
      const res = await roomGateway.handlePromoteListener(hostSocket, {
        roomId,
        targetUserId: listenerId,
      });

      expect(res.success).toBe(true);
      expect(res.speaker.userId).toBe(listenerId);
    });

    it('should allow host to demote speaker to listener', async () => {
      const hostSocket = createMockSocket(hostId);
      await roomGateway.handlePromoteListener(hostSocket, {
        roomId,
        targetUserId: listenerId,
      });

      const res = await roomGateway.handleDemoteSpeaker(hostSocket, {
        roomId,
        targetUserId: listenerId,
      });

      expect(res.success).toBe(true);
      expect(mockServer.emit).toHaveBeenCalledWith(
        'speaker_demoted',
        expect.anything(),
      );
    });

    it('should fail demoting user who is not on stage', async () => {
      const hostSocket = createMockSocket(hostId);
      const res = await roomGateway.handleDemoteSpeaker(hostSocket, {
        roomId,
        targetUserId: 'non-stage-user',
      });

      expect(res.success).toBe(false);
      expect(res.error).toBe(SocketErrorCode.USER_NOT_ON_STAGE);
    });

    it('should allow speaker to mute and unmute self', async () => {
      const hostSocket = createMockSocket(hostId);
      const muteRes = await roomGateway.handleMuteSpeaker(hostSocket, {
        roomId,
      });
      expect(muteRes.success).toBe(true);
      expect(muteRes.isMuted).toBe(true);

      const unmuteRes = await roomGateway.handleUnmuteSpeaker(hostSocket, {
        roomId,
      });
      expect(unmuteRes.success).toBe(true);
      expect(unmuteRes.isMuted).toBe(false);
    });

    it('should reject non-moderator attempting to mute another speaker', async () => {
      const listenerSocket = createMockSocket(listenerId);
      const res = await roomGateway.handleMuteSpeaker(listenerSocket, {
        roomId,
        targetUserId: hostId,
      });

      expect(res.success).toBe(false);
      expect(res.error).toBe(SocketErrorCode.NOT_MODERATOR);
    });
  });

  describe('3. Live Emoji Reactions', () => {
    const roomId = 'room-reactions-303';
    const userId = 'user-emoji-1';

    beforeEach(async () => {
      mockRoomRepository.findOne.mockResolvedValue({
        id: roomId,
        hostId: 'host-reactions-303',
        status: 'live',
      });
      await roomStateService.getOrCreateRoomState(roomId, 'host-reactions-303');
      await roomStateService.addParticipant(roomId, userId, 'sock-emoji');
      mockRoomRepository.save.mockClear();
    });

    it('should broadcast valid emoji reaction without database persistence', async () => {
      const socket = createMockSocket(userId);
      const res = await reactionsGateway.handleSendEmojiReaction(socket, {
        roomId,
        emoji: '🔥',
      });

      expect(res.success).toBe(true);
      expect('emoji' in res ? res.emoji : undefined).toBe('🔥');
      expect(mockServer.emit).toHaveBeenCalledWith(
        'emoji_reaction_received',
        expect.objectContaining({ roomId, emoji: '🔥' }),
      );
      expect(mockRoomRepository.save).not.toHaveBeenCalled();
    });

    it('should reject invalid emoji string with INVALID_EMOJI error code', async () => {
      const socket = createMockSocket(userId);
      const res = await reactionsGateway.handleSendEmojiReaction(socket, {
        roomId,
        emoji: 'not_a_valid_emoji_text',
      });

      expect(res.success).toBe(false);
      expect('error' in res ? res.error : undefined).toBe(
        SocketErrorCode.INVALID_EMOJI,
      );
    });
  });

  describe('4. Gift Broadcast Events', () => {
    const roomId = 'room-gifts-404';
    const senderId = 'sender-1';

    beforeEach(async () => {
      mockRoomRepository.findOne.mockResolvedValue({
        id: roomId,
        hostId: 'host-gifts-404',
        status: 'live',
      });
      await roomStateService.getOrCreateRoomState(roomId, 'host-gifts-404');
      await roomStateService.addParticipant(roomId, senderId, 'sock-gift');
    });

    it('should broadcast gift events without altering wallet or balance', async () => {
      const socket = createMockSocket(senderId);
      const res = await reactionsGateway.handleSendGiftEvent(socket, {
        roomId,
        recipientId: 'creator-1',
        giftId: 'gift-dragon-01',
        giftName: 'Golden Dragon',
        coinValue: 500,
      });

      expect(res.success).toBe(true);
      expect('status' in res ? res.status : undefined).toBe('broadcasted');
      expect(mockServer.emit).toHaveBeenCalledWith(
        'gift.sent',
        expect.anything(),
      );
      expect(mockServer.emit).toHaveBeenCalledWith(
        'gift.received',
        expect.anything(),
      );
      expect(mockServer.emit).toHaveBeenCalledWith(
        'gift.animation',
        expect.anything(),
      );
    });
  });

  describe('5. Room Topic Updates', () => {
    const roomId = 'room-topic-505';
    const hostId = 'host-505';

    beforeEach(async () => {
      mockRoomRepository.findOne.mockResolvedValue({
        id: roomId,
        hostId,
        status: 'live',
        title: 'Old Title',
        description: 'Old Description',
        category: 'General',
      });
      await roomStateService.getOrCreateRoomState(roomId, hostId);
      await roomStateService.addParticipant(
        roomId,
        'random-user-99',
        'sock-random',
      );
    });

    it('should allow host to update title, description, category and persist to Room entity', async () => {
      const hostSocket = createMockSocket(hostId);
      const res = await roomGateway.handleUpdateRoomTopic(hostSocket, {
        roomId,
        title: 'New AI Voice Strategy',
        description: 'Discussing AI models',
        category: 'Technology',
      });

      expect(res.success).toBe(true);
      expect((res as any).title).toBe('New AI Voice Strategy');
      expect(mockRoomRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'New AI Voice Strategy',
          category: 'Technology',
        }),
      );
      expect(mockServer.emit).toHaveBeenCalledWith(
        'room_topic_updated',
        expect.objectContaining({ title: 'New AI Voice Strategy' }),
      );
    });

    it('should reject topic updates from non-moderator/host', async () => {
      const randomSocket = createMockSocket('random-user-99');
      const res = await roomGateway.handleUpdateRoomTopic(randomSocket, {
        roomId,
        title: 'Hacked Title',
      });

      expect(res.success).toBe(false);
      expect(res.error).toBe(SocketErrorCode.NOT_ROOM_OWNER);
    });
  });

  describe('6. Presence Events', () => {
    const roomId = 'room-presence-606';

    it('should handle user joining presence and broadcast user_joined', async () => {
      const socket = createMockSocket('user-pres-1', 'sock-p1');
      const res = await presenceGateway.handleJoinPresence(socket, {
        roomId,
        username: 'Charlie',
      });

      expect(res.success).toBe(true);
      expect(
        'participantCount' in res ? res.participantCount : undefined,
      ).toBe(1);
      expect(socket.join).toHaveBeenCalledWith(roomId);
      expect(mockServer.emit).toHaveBeenCalledWith(
        'user_joined',
        expect.anything(),
      );
    });

    it('should handle user leaving presence and update participant count', async () => {
      const socket = createMockSocket('user-pres-1', 'sock-p1');
      await presenceGateway.handleJoinPresence(socket, { roomId });

      const leaveRes = await presenceGateway.handleLeavePresence(socket, {
        roomId,
      });
      expect(leaveRes.success).toBe(true);
      expect(
        'participantCount' in leaveRes
          ? leaveRes.participantCount
          : undefined,
      ).toBe(0);
      expect(mockServer.emit).toHaveBeenCalledWith(
        'user_left',
        expect.anything(),
      );
    });

    it('should handle user reconnection', async () => {
      const socket = createMockSocket('user-pres-1', 'sock-p1-new');
      const res = await presenceGateway.handleReconnect(socket, { roomId });

      expect(res.success).toBe(true);
      expect(mockServer.emit).toHaveBeenCalledWith(
        'user_reconnected',
        expect.anything(),
      );
    });

    it('should handle chat typing status', async () => {
      const socket = createMockSocket('user-pres-1');
      await presenceGateway.handleJoinPresence(socket, { roomId });
      const res = await presenceGateway.handleTypingStatus(socket, {
        roomId,
        isTyping: true,
      });

      expect(res.success).toBe(true);
      expect(mockServer.emit).toHaveBeenCalledWith(
        'user_typing',
        expect.objectContaining({ isTyping: true }),
      );
    });

    it('should respond to heartbeat/ping', () => {
      const socket = createMockSocket('user-pres-1');
      const res = presenceGateway.handlePing(socket, { timestamp: 123456 });

      expect(res.success).toBe(true);
      expect('pong' in res ? res.pong : undefined).toBe(true);
    });

    it('should return online participant count', async () => {
      const socket = createMockSocket('user-pres-1');
      await presenceGateway.handleJoinPresence(socket, { roomId });

      const res = await presenceGateway.handleGetParticipantCount(socket, {
        roomId,
      });
      expect(res.success).toBe(true);
      expect(
        'participantCount' in res ? res.participantCount : undefined,
      ).toBe(1);
    });
  });
});
