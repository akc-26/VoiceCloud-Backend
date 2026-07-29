import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RankingsService } from './rankings.service';
import { RankingsController } from './rankings.controller';
import { RecommendationsService } from './recommendations.service';
import { User } from '../users/entities/user.entity';
import { Room } from '../rooms/entities/room.entity';
import { HostProfile } from '../hosts/entities/host-profile.entity';
import { Agency } from '../agencies/entities/agency.entity';
import { Club } from '../clubs/entities/club.entity';
import { GiftTransaction } from '../gifts/entities/gift-transaction.entity';
import { VipMembership } from '../vip/entities/vip-membership.entity';
import { RankingSnapshot } from './entities/ranking-snapshot.entity';
import { RedisService } from '../../redis/redis.service';
import { EventsGateway } from '../../common/events/events.gateway';
import { LeaderboardCalculationProcessor } from '../../queue/processors/leaderboard-calculation.processor';
import { JOB_TYPES } from '../../queue/queue.constants';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

describe('Phase 27 - Rankings, Leaderboards & Trending System', () => {
  let rankingsService: RankingsService;
  let rankingsController: RankingsController;
  let processor: LeaderboardCalculationProcessor;

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([
      [
        {
          id: 'user-1',
          username: 'alex',
          displayName: 'Alex Smith',
          popularityScore: 500,
          followersCount: 100,
          country: 'US',
        },
      ],
      1,
    ]),
    getMany: jest.fn().mockResolvedValue([
      {
        id: 'user-1',
        username: 'alex',
        displayName: 'Alex Smith',
        popularityScore: 500,
        followersCount: 100,
        country: 'US',
      },
    ]),
    getRawMany: jest
      .fn()
      .mockResolvedValue([
        { userId: 'user-1', totalCoinsSent: 1000, giftCount: 5 },
      ]),
    getRawOne: jest.fn().mockResolvedValue({ total: '1' }),
  };

  const mockRepository = {
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    find: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockImplementation((dto) => ({ id: 'snap-1', ...dto })),
    save: jest
      .fn()
      .mockImplementation((entity) =>
        Promise.resolve({ id: 'snap-1', ...entity }),
      ),
  };

  const mockRedisService = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
  };

  const mockEventsGateway = {
    broadcastLeaderboardEvent: jest.fn(),
    broadcastTrendingEvent: jest.fn(),
    broadcastRankingEvent: jest.fn(),
    broadcastLiveRoomRankingEvent: jest.fn(),
  };

  const mockRecommendationsService = {
    recommendRooms: jest.fn().mockResolvedValue({ items: [], total: 0 }),
    recommendUsers: jest.fn().mockResolvedValue({ items: [], total: 0 }),
    recommendHosts: jest.fn().mockResolvedValue({ items: [], total: 0 }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RankingsService,
        RankingsController,
        LeaderboardCalculationProcessor,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(Room),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(HostProfile),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(Agency),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(Club),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(GiftTransaction),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(VipMembership),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(RankingSnapshot),
          useValue: mockRepository,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: EventsGateway,
          useValue: mockEventsGateway,
        },
        {
          provide: RecommendationsService,
          useValue: mockRecommendationsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    rankingsService = module.get<RankingsService>(RankingsService);
    rankingsController = module.get<RankingsController>(RankingsController);
    processor = module.get<LeaderboardCalculationProcessor>(
      LeaderboardCalculationProcessor,
    );
  });

  it('should be defined', () => {
    expect(rankingsService).toBeDefined();
    expect(rankingsController).toBeDefined();
    expect(processor).toBeDefined();
  });

  describe('RankingsService', () => {
    it('should calculate user rankings and store in Redis', async () => {
      const result = await rankingsService.getLeaderboard('users', {
        country: 'US',
        page: 1,
        limit: 10,
      });

      expect(result.category).toBe('users');
      expect(result.items.length).toBe(1);
      expect(mockRedisService.set).toHaveBeenCalled();
      expect(mockEventsGateway.broadcastLeaderboardEvent).toHaveBeenCalledWith(
        'leaderboard_updated',
        expect.any(Object),
      );
    });

    it('should calculate host rankings', async () => {
      const result = await rankingsService.getLeaderboard('hosts', {
        country: 'US',
      });
      expect(result.category).toBe('hosts');
    });

    it('should calculate agency rankings', async () => {
      const result = await rankingsService.getLeaderboard('agencies', {});
      expect(result.category).toBe('agencies');
    });

    it('should calculate club rankings', async () => {
      const result = await rankingsService.getLeaderboard('clubs', {});
      expect(result.category).toBe('clubs');
    });

    it('should calculate room rankings', async () => {
      const result = await rankingsService.getLeaderboard('rooms', {});
      expect(result.category).toBe('rooms');
    });

    it('should calculate VIP rankings', async () => {
      const result = await rankingsService.getLeaderboard('vip', {});
      expect(result.category).toBe('vip');
    });

    it('should calculate creator rankings', async () => {
      const result = await rankingsService.getLeaderboard('creators', {});
      expect(result.category).toBe('creators');
    });

    it('should calculate gift senders and receivers rankings', async () => {
      const senders = await rankingsService.getLeaderboard('gift-senders', {});
      const receivers = await rankingsService.getLeaderboard(
        'gift-receivers',
        {},
      );
      expect(senders.category).toBe('gift-senders');
      expect(receivers.category).toBe('gift-receivers');
    });

    it('should calculate trending summary across entities', async () => {
      const trending = await rankingsService.getTrendingSummary({ limit: 5 });
      expect(trending.limit).toBe(5);
      expect(trending.fastestRisingUsers).toBeDefined();
      expect(mockEventsGateway.broadcastTrendingEvent).toHaveBeenCalledWith(
        'trending_updated',
        expect.any(Object),
      );
    });

    it('should create historical ranking snapshots', async () => {
      const snapshot = await rankingsService.createSnapshot(
        'users',
        'daily',
        '2026-07-29',
      );
      expect(snapshot.id).toBe('snap-1');
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should refresh ranking caches and return refreshed keys', async () => {
      const refresh = await rankingsService.refreshRankingCache();
      expect(refresh.refreshedKeys.length).toBeGreaterThan(0);
      expect(mockEventsGateway.broadcastLeaderboardEvent).toHaveBeenCalledWith(
        'cache_refreshed',
        expect.any(Object),
      );
    });

    it('should get cache status', async () => {
      const status = await rankingsService.getCacheStatus();
      expect(status.cachedKeys).toBeDefined();
      expect(status.totalCached).toBeDefined();
    });

    it('should broadcast live room ranking change', () => {
      const result = rankingsService.broadcastLiveRoomRankingChange({
        roomId: 'room-1',
        rank: 1,
      });
      expect(result.status).toBe('broadcasted');
      expect(mockEventsGateway.broadcastRankingEvent).toHaveBeenCalled();
      expect(
        mockEventsGateway.broadcastLiveRoomRankingEvent,
      ).toHaveBeenCalled();
    });
  });

  describe('RankingsController', () => {
    it('should return global user leaderboard', async () => {
      const res = await rankingsController.getGlobalLeaderboard({});
      expect(res.category).toBe('users');
    });

    it('should return trending summary', async () => {
      const res = await rankingsController.getTrendingSummary({});
      expect(res.limit).toBeDefined();
    });

    it('should trigger admin cache refresh', async () => {
      const res = await rankingsController.refreshCache();
      expect(res.refreshedKeys).toBeDefined();
    });

    it('should trigger admin snapshot creation', async () => {
      const res = await rankingsController.createSnapshot({
        category: 'users',
        timeframe: 'daily',
        periodIdentifier: '2026-07-29',
      });
      expect(res.id).toBe('snap-1');
    });
  });

  describe('LeaderboardCalculationProcessor', () => {
    it('should process ranking calculation job', async () => {
      const res = await processor.process({
        id: 'job-1',
        name: JOB_TYPES.RANKINGS.RANKING_CALCULATION,
        data: { category: 'users' },
      } as any);
      expect(res.status).toBe('completed');
      expect(res.task).toBe('ranking-calculation');
    });

    it('should process trending calculation job', async () => {
      const res = await processor.process({
        id: 'job-2',
        name: JOB_TYPES.RANKINGS.TRENDING_CALCULATION,
        data: {},
      } as any);
      expect(res.status).toBe('completed');
      expect(res.task).toBe('trending-calculation');
    });

    it('should process historical snapshot job', async () => {
      const res = await processor.process({
        id: 'job-3',
        name: JOB_TYPES.RANKINGS.HISTORICAL_SNAPSHOT,
        data: { category: 'users', timeframe: 'daily' },
      } as any);
      expect(res.status).toBe('completed');
      expect(res.task).toBe('historical-snapshot');
    });

    it('should process cache refresh job', async () => {
      const res = await processor.process({
        id: 'job-4',
        name: JOB_TYPES.RANKINGS.CACHE_REFRESH,
        data: {},
      } as any);
      expect(res.status).toBe('completed');
      expect(res.task).toBe('cache-refresh');
    });
  });
});
