import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VipService } from './vip.service';
import { VipController } from './vip.controller';
import {
  VipTier,
  VipMembership,
  VipBenefit,
  VipReward,
  VipRewardClaim,
  VipTransaction,
  VipStatus,
  SubscriptionCycle,
} from './entities';
import { Gift } from '../gifts/entities/gift.entity';
import { EventsGateway } from '../../common/events/events.gateway';
import { RedisService } from '../../redis/redis.service';
import { NotificationsService } from '../notifications/notifications.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { JwtTokenService } from '../auth/jwt-token.service';

describe('Phase 24 - VIP System Tests', () => {
  let service: VipService;
  let controller: VipController;

  const mockRepository = () => ({
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockImplementation((dto) => ({ id: 'mock-id', ...dto })),
    save: jest
      .fn()
      .mockImplementation((entity) =>
        Promise.resolve({ id: 'mock-id', ...entity }),
      ),
    remove: jest.fn().mockResolvedValue(true),
    count: jest.fn().mockResolvedValue(0),
  });

  const mockEventsGateway = {
    broadcastVipEvent: jest.fn(),
  };

  const mockRedisService = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
  };

  const mockNotificationsService = {
    createNotification: jest.fn().mockResolvedValue({ id: 'notif-1' }),
  };

  const mockJwtTokenService = {
    verifyToken: jest.fn().mockReturnValue({ userId: 'user-1' }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VipController],
      providers: [
        VipService,
        { provide: getRepositoryToken(VipTier), useFactory: mockRepository },
        {
          provide: getRepositoryToken(VipMembership),
          useFactory: mockRepository,
        },
        { provide: getRepositoryToken(VipBenefit), useFactory: mockRepository },
        { provide: getRepositoryToken(VipReward), useFactory: mockRepository },
        {
          provide: getRepositoryToken(VipRewardClaim),
          useFactory: mockRepository,
        },
        {
          provide: getRepositoryToken(VipTransaction),
          useFactory: mockRepository,
        },
        { provide: getRepositoryToken(Gift), useFactory: mockRepository },
        { provide: EventsGateway, useValue: mockEventsGateway },
        { provide: RedisService, useValue: mockRedisService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: JwtTokenService, useValue: mockJwtTokenService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    service = module.get<VipService>(VipService);
    controller = module.get<VipController>(VipController);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(controller).toBeDefined();
  });

  it('should seed default VIP tiers if table is empty', async () => {
    const tierRepo = (service as any).tierRepository as Repository<VipTier>;
    jest.spyOn(tierRepo, 'count').mockResolvedValue(0);
    const saveSpy = jest.spyOn(tierRepo, 'save');

    await service.seedDefaultTiers();
    expect(saveSpy).toHaveBeenCalled();
  });

  it('should return badges for a given level', () => {
    const badgesL1 = service.getBadgesForLevel(1);
    expect(badgesL1.profileBadge).toContain('vip_1');

    const badgesL0 = service.getBadgesForLevel(0);
    expect(badgesL0.profileBadge).toBe('');
  });

  it('should subscribe a user to a VIP tier', async () => {
    const tierRepo = (service as any).tierRepository;
    const memRepo = (service as any).membershipRepository;

    const mockTier: Partial<VipTier> = {
      id: 'tier-1',
      name: 'VIP 1 Silver',
      level: 1,
      monthlyPrice: 9.99,
      badge: 'Silver Badge',
      activationStatus: true,
      isActive: true,
    };

    jest.spyOn(tierRepo, 'findOne').mockResolvedValue(mockTier);
    jest.spyOn(memRepo, 'findOne').mockResolvedValue(null);

    const result = await service.subscribe('user-1', {
      tierId: 'tier-1',
      cycle: SubscriptionCycle.MONTHLY,
    });

    expect(result).toBeDefined();
    expect(result.level).toBe(1);
    expect(result.status).toBe(VipStatus.ACTIVE);
    expect(mockEventsGateway.broadcastVipEvent).toHaveBeenCalled();
  });

  it('should calculate room privileges based on VIP level', async () => {
    jest.spyOn(service, 'getCurrentMembershipDetails').mockResolvedValue({
      isVip: true,
      currentLevel: 5,
    });

    const privs = await service.getRoomPrivileges('user-1');
    expect(privs.isVip).toBe(true);
    expect(privs.hasReservedSeats).toBe(true);
    expect(privs.moderationPrivileges.canMuteOthers).toBe(true);
  });

  it('should return VIP analytics metrics', async () => {
    const analytics = await service.getVipAnalytics();
    expect(analytics.activeMembers).toBeDefined();
    expect(analytics.totalRevenue).toBeDefined();
    expect(analytics.revenueByCycle).toBeDefined();
  });
});
