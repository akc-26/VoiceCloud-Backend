import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ChatService } from './chat.service';
import { Conversation, ConversationType } from './entities/conversation.entity';
import {
  ConversationMember,
  MemberRole,
} from './entities/conversation-member.entity';
import { Message, MessageType } from './entities/message.entity';
import { MessageReaction } from './entities/message-reaction.entity';
import { MessageReport } from './entities/message-report.entity';
import { VoiceNote } from './entities/voice-note.entity';
import { StorageService } from '../storage/storage.service';
import { RedisService } from '../../redis/redis.service';
import { EventsGateway } from '../../common/events/events.gateway';
import { QueueService } from '../../queue/queue.service';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';

describe('ChatService', () => {
  let service: ChatService;

  const mockRepo = () => ({
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockImplementation((dto) => ({ id: 'uuid-123', ...dto })),
    save: jest
      .fn()
      .mockImplementation((entity) =>
        Promise.resolve({ id: 'uuid-123', ...entity }),
      ),
    count: jest.fn().mockResolvedValue(0),
    softDelete: jest.fn().mockResolvedValue({ affected: 1 }),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
    createQueryBuilder: jest.fn().mockReturnValue({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      getCount: jest.fn().mockResolvedValue(0),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 1 }),
    }),
  });

  const mockStorageService = {
    uploadFile: jest
      .fn()
      .mockResolvedValue({ publicUrl: 'http://test/file.png' }),
  };

  const mockRedisService = {
    set: jest.fn().mockResolvedValue('OK'),
    get: jest.fn().mockResolvedValue(null),
    del: jest.fn().mockResolvedValue(1),
  };

  const mockEventsGateway = {
    broadcastToRoom: jest.fn(),
    broadcastUserPresenceUpdated: jest.fn(),
    broadcastToAdmin: jest.fn(),
  };

  const mockQueueService = {
    addChatJob: jest.fn().mockResolvedValue({ id: 'job-1' }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: getRepositoryToken(Conversation), useValue: mockRepo() },
        {
          provide: getRepositoryToken(ConversationMember),
          useValue: mockRepo(),
        },
        { provide: getRepositoryToken(Message), useValue: mockRepo() },
        { provide: getRepositoryToken(MessageReaction), useValue: mockRepo() },
        { provide: getRepositoryToken(MessageReport), useValue: mockRepo() },
        { provide: getRepositoryToken(VoiceNote), useValue: mockRepo() },
        { provide: StorageService, useValue: mockStorageService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: EventsGateway, useValue: mockEventsGateway },
        { provide: QueueService, useValue: mockQueueService },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createConversation', () => {
    it('should throw error if direct message has no recipient', async () => {
      await expect(
        service.createConversation('user-1', {
          type: ConversationType.DIRECT,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error if direct message recipient is self', async () => {
      await expect(
        service.createConversation('user-1', {
          type: ConversationType.DIRECT,
          recipientId: 'user-1',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updatePresence', () => {
    it('should set online key in redis when online', async () => {
      const res = await service.updatePresence('user-1', 'online');
      expect(res.status).toBe('online');
      expect(mockRedisService.set).toHaveBeenCalled();
      expect(mockEventsGateway.broadcastUserPresenceUpdated).toHaveBeenCalled();
    });
  });

  describe('setTypingStatus', () => {
    it('should set typing status in redis and broadcast event', async () => {
      const res = await service.setTypingStatus('conv-1', 'user-1', true);
      expect(res.isTyping).toBe(true);
      expect(mockRedisService.set).toHaveBeenCalled();
      expect(mockEventsGateway.broadcastToRoom).toHaveBeenCalledWith(
        'conv-1',
        'chat_typing',
        expect.any(Object),
      );
    });
  });
});
