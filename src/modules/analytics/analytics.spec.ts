import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { RoomAnalyticsService } from './room-analytics.service';
import { Room } from '../rooms/entities/room.entity';
import { RedisService } from '../../redis/redis.service';

describe('RoomAnalyticsService', () => {
  let service: RoomAnalyticsService;
  let roomRepository: any;
  let redisService: any;

  const mockRoom = {
    id: 'room-1',
    title: 'Live Podcast Session',
    hostId: 'host-1',
    isLive: true,
    listenerCount: 50,
    speakerCount: 4,
    giftActivity: 2500,
    popularityScore: 1200,
    category: 'Music',
    createdAt: new Date(),
  };

  beforeEach(async () => {
    roomRepository = {
      findOne: jest.fn(),
    };

    redisService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomAnalyticsService,
        { provide: getRepositoryToken(Room), useValue: roomRepository },
        { provide: RedisService, useValue: redisService },
      ],
    }).compile();

    service = module.get<RoomAnalyticsService>(RoomAnalyticsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getRealtimeRoomAnalytics', () => {
    it('should throw NotFoundException if room is not found', async () => {
      roomRepository.findOne.mockResolvedValue(null);
      await expect(
        service.getRealtimeRoomAnalytics('room-invalid', {}),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return realtime analytics metrics correctly', async () => {
      roomRepository.findOne.mockResolvedValue(mockRoom);
      redisService.get
        .mockResolvedValueOnce('120') // peak
        .mockResolvedValueOnce('7200') // audio duration
        .mockResolvedValueOnce('5000') // gifts
        .mockResolvedValueOnce('150'); // chat count

      const result = await service.getRealtimeRoomAnalytics('room-1', {});

      expect(result.roomId).toBe('room-1');
      expect(result.metrics.currentListeners).toBe(50);
      expect(result.metrics.peakListeners).toBe(120);
      expect(result.metrics.engagementScore).toBeGreaterThan(0);
      expect(result.listenerRetentionCurve.length).toBe(4);
    });
  });

  describe('getSessionSummaryReport', () => {
    it('should return post-session summary report', async () => {
      roomRepository.findOne.mockResolvedValue(mockRoom);

      const result = await service.getSessionSummaryReport('room-1');

      expect(result.roomId).toBe('room-1');
      expect(result.summary.peakConcurrentViewers).toBe(50);
      expect(result.summary.totalGiftsEarnedCoins).toBe(2500);
    });
  });
});
