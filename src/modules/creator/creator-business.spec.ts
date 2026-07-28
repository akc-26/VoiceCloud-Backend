import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtTokenService } from '../auth/jwt-token.service';
import { CreatorService } from './creator.service';
import { CreatorController } from './creator.controller';
import { CreatorPlan } from '../users/entities/creator-plan.entity';
import { CreatorSubscription } from '../users/entities/creator-subscription.entity';
import { CreatorPayoutRequest } from '../users/entities/creator-payout-request.entity';
import { User } from '../users/entities/user.entity';
import { WalletBalance } from '../wallet/entities/wallet-balance.entity';
import {
  CreatorPlanStatus,
  SubscriptionStatus,
  PayoutStatus,
  PayoutMethod,
  VisibilityType,
} from '../../common/enums';

describe('Phase 2D Creator Economy Business APIs', () => {
  let service: CreatorService;
  let controller: CreatorController;

  const mockPlanRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockSubscriptionRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockPayoutRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
  };

  const mockWalletBalanceRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CreatorController],
      providers: [
        CreatorService,
        {
          provide: getRepositoryToken(CreatorPlan),
          useValue: mockPlanRepository,
        },
        {
          provide: getRepositoryToken(CreatorSubscription),
          useValue: mockSubscriptionRepository,
        },
        {
          provide: getRepositoryToken(CreatorPayoutRequest),
          useValue: mockPayoutRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(WalletBalance),
          useValue: mockWalletBalanceRepository,
        },
        Reflector,
        {
          provide: JwtTokenService,
          useValue: {
            verifyAccessToken: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CreatorService>(CreatorService);
    controller = module.get<CreatorController>(CreatorController);
  });

  describe('CreatorService - Plan Management', () => {
    it('should create a plan successfully', async () => {
      const dto = {
        title: 'VIP Pass',
        description: 'VIP perks',
        monthlyPrice: 9.99,
        yearlyPrice: 99.99,
        benefits: ['Badge'],
        visibility: VisibilityType.PUBLIC,
      };

      const createdPlan = { id: 'plan-1', creatorId: 'creator-1', ...dto, status: CreatorPlanStatus.ACTIVE };
      mockPlanRepository.create.mockReturnValue(createdPlan);
      mockPlanRepository.save.mockResolvedValue(createdPlan);

      const result = await service.createPlan('creator-1', dto);

      expect(result).toEqual(createdPlan);
      expect(mockPlanRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ creatorId: 'creator-1', title: 'VIP Pass' }),
      );
    });

    it('should update plan if caller is owner', async () => {
      const existingPlan = { id: 'plan-1', creatorId: 'creator-1', title: 'Old Title' };
      mockPlanRepository.findOne.mockResolvedValue(existingPlan);
      mockPlanRepository.save.mockImplementation((p) => Promise.resolve(p));

      const updated = await service.updatePlan('creator-1', 'plan-1', { title: 'New Title' });

      expect(updated.title).toBe('New Title');
    });

    it('should throw NotFoundException on update if plan does not exist', async () => {
      mockPlanRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updatePlan('creator-1', 'invalid-plan', { title: 'New Title' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException on update if caller is not plan owner', async () => {
      const existingPlan = { id: 'plan-1', creatorId: 'other-creator', title: 'Old Title' };
      mockPlanRepository.findOne.mockResolvedValue(existingPlan);

      await expect(
        service.updatePlan('creator-1', 'plan-1', { title: 'New Title' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should archive plan when deleted by owner', async () => {
      const existingPlan = { id: 'plan-1', creatorId: 'creator-1', status: CreatorPlanStatus.ACTIVE };
      mockPlanRepository.findOne.mockResolvedValue(existingPlan);
      mockPlanRepository.save.mockImplementation((p) => Promise.resolve(p));

      const result = await service.deletePlan('creator-1', 'plan-1');

      expect(result.status).toBe(CreatorPlanStatus.ARCHIVED);
    });

    it('should return public plans for valid creator', async () => {
      mockUserRepository.findOne.mockResolvedValue({ id: 'creator-1' });
      const publicPlans = [{ id: 'plan-1', visibility: VisibilityType.PUBLIC, status: CreatorPlanStatus.ACTIVE }];
      mockPlanRepository.find.mockResolvedValue(publicPlans);

      const res = await service.getPublicCreatorPlans('creator-1');

      expect(res).toEqual(publicPlans);
    });

    it('should throw NotFoundException on public plans if creator does not exist', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.getPublicCreatorPlans('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('CreatorService - Subscriptions', () => {
    it('should throw BadRequestException if user subscribes to self', async () => {
      await expect(
        service.subscribeToCreator('creator-1', 'creator-1', { planId: 'plan-1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if plan for subscription is missing', async () => {
      mockPlanRepository.findOne.mockResolvedValue(null);

      await expect(
        service.subscribeToCreator('user-1', 'creator-1', { planId: 'plan-invalid' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if plan does not belong to creator', async () => {
      mockPlanRepository.findOne.mockResolvedValue({ id: 'plan-1', creatorId: 'different-creator' });

      await expect(
        service.subscribeToCreator('user-1', 'creator-1', { planId: 'plan-1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if active subscription already exists', async () => {
      mockPlanRepository.findOne.mockResolvedValue({
        id: 'plan-1',
        creatorId: 'creator-1',
        status: CreatorPlanStatus.ACTIVE,
      });
      mockSubscriptionRepository.findOne.mockResolvedValue({ id: 'sub-existing', status: SubscriptionStatus.ACTIVE });

      await expect(
        service.subscribeToCreator('user-1', 'creator-1', { planId: 'plan-1' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should create subscription intent record successfully', async () => {
      mockPlanRepository.findOne.mockResolvedValue({
        id: 'plan-1',
        creatorId: 'creator-1',
        status: CreatorPlanStatus.ACTIVE,
      });
      mockSubscriptionRepository.findOne.mockResolvedValue(null);

      const createdSub = {
        id: 'sub-1',
        subscriberId: 'user-1',
        creatorId: 'creator-1',
        planId: 'plan-1',
        status: SubscriptionStatus.ACTIVE,
      };

      mockSubscriptionRepository.create.mockReturnValue(createdSub);
      mockSubscriptionRepository.save.mockResolvedValue(createdSub);

      const res = await service.subscribeToCreator('user-1', 'creator-1', { planId: 'plan-1' });

      expect(res).toEqual(createdSub);
      expect(mockSubscriptionRepository.save).toHaveBeenCalled();
    });
  });

  describe('CreatorService - Earnings & Dashboard', () => {
    it('should calculate earnings overview accurately', async () => {
      mockSubscriptionRepository.count.mockResolvedValue(5);
      mockSubscriptionRepository.find.mockResolvedValue([
        { plan: { monthlyPrice: 10 } },
        { plan: { monthlyPrice: 20 } },
      ]);
      mockPlanRepository.count.mockResolvedValue(2);
      mockPayoutRepository.find.mockImplementation(({ where }: any) => {
        if (where.status === PayoutStatus.PENDING) {
          return Promise.resolve([{ payoutAmount: 50 }]);
        }
        if (where.status === PayoutStatus.PROCESSED) {
          return Promise.resolve([{ payoutAmount: 100 }]);
        }
        return Promise.resolve([]);
      });

      const earnings = await service.getEarningsOverview('creator-1');

      expect(earnings.totalSubscribers).toBe(5);
      expect(earnings.estimatedRecurringRevenue).toBe(30);
      expect(earnings.pendingPayoutsAmount).toBe(50);
      expect(earnings.completedPayoutsAmount).toBe(100);
      expect(earnings.lifetimeEarnings).toBe(130);
    });

    it('should retrieve full creator dashboard', async () => {
      mockUserRepository.findOne.mockResolvedValue({
        id: 'creator-1',
        username: 'alice',
        displayName: 'Alice',
        isVerified: true,
      });

      mockPlanRepository.count.mockResolvedValue(2);
      mockSubscriptionRepository.count.mockResolvedValue(10);
      mockPayoutRepository.count.mockResolvedValue(1);
      mockSubscriptionRepository.find.mockResolvedValue([]);
      mockPayoutRepository.find.mockResolvedValue([]);

      const dashboard = await service.getCreatorDashboard('creator-1');

      expect(dashboard.creatorProfile.username).toBe('alice');
      expect(dashboard.plansSummary.totalPlans).toBe(2);
      expect(dashboard.subscriberCount).toBe(10);
      expect(dashboard.earningsSummary).toBeDefined();
    });
  });

  describe('CreatorService - Payout Requests', () => {
    it('should throw BadRequestException if requested diamonds < 100', async () => {
      await expect(
        service.submitPayoutRequest('creator-1', {
          diamondAmount: 50,
          payoutMethod: PayoutMethod.BANK_TRANSFER,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if duplicate pending payout exists', async () => {
      mockPayoutRepository.findOne.mockResolvedValue({ id: 'payout-pending', status: PayoutStatus.PENDING });

      await expect(
        service.submitPayoutRequest('creator-1', {
          diamondAmount: 1000,
          payoutMethod: PayoutMethod.BANK_TRANSFER,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException if diamond balance is insufficient', async () => {
      mockPayoutRepository.findOne.mockResolvedValue(null);
      mockWalletBalanceRepository.findOne.mockResolvedValue({ diamondBalance: 500 });

      await expect(
        service.submitPayoutRequest('creator-1', {
          diamondAmount: 1000,
          payoutMethod: PayoutMethod.BANK_TRANSFER,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should submit payout request successfully if eligible', async () => {
      mockPayoutRepository.findOne.mockResolvedValue(null);
      mockWalletBalanceRepository.findOne.mockResolvedValue({ diamondBalance: 2000 });

      const mockRequest = {
        id: 'payout-1',
        creatorId: 'creator-1',
        diamondAmount: 1000,
        payoutAmount: 5.0,
        payoutMethod: PayoutMethod.BANK_TRANSFER,
        status: PayoutStatus.PENDING,
      };

      mockPayoutRepository.create.mockReturnValue(mockRequest);
      mockPayoutRepository.save.mockResolvedValue(mockRequest);

      const res = await service.submitPayoutRequest('creator-1', {
        diamondAmount: 1000,
        payoutMethod: PayoutMethod.BANK_TRANSFER,
      });

      expect(res).toEqual(mockRequest);
      expect(res.payoutAmount).toBe(5.0);
    });

    it('should throw ForbiddenException if user views another creator payout details', async () => {
      mockPayoutRepository.findOne.mockResolvedValue({
        id: 'payout-1',
        creatorId: 'other-creator',
      });

      await expect(
        service.getPayoutRequestById('creator-1', 'payout-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('CreatorController Delegation', () => {
    it('should delegate getDashboard to service', async () => {
      const spy = jest.spyOn(service, 'getCreatorDashboard').mockResolvedValue({ subscriberCount: 5 } as any);
      const res = await controller.getDashboard('user-1');
      expect(spy).toHaveBeenCalledWith('user-1');
      expect(res).toEqual({ subscriberCount: 5 });
    });

    it('should delegate createPlan to service', async () => {
      const dto = { title: 'Plan 1', monthlyPrice: 5 };
      const spy = jest.spyOn(service, 'createPlan').mockResolvedValue({ id: 'plan-1' } as any);
      const res = await controller.createPlan('user-1', dto as any);
      expect(spy).toHaveBeenCalledWith('user-1', dto);
      expect(res).toEqual({ id: 'plan-1' });
    });

    it('should delegate getMyPlans to service', async () => {
      const spy = jest.spyOn(service, 'getCreatorPlans').mockResolvedValue({ total: 1 } as any);
      const query = { page: 1, limit: 10 };
      const res = await controller.getMyPlans('user-1', query);
      expect(spy).toHaveBeenCalledWith('user-1', query);
      expect(res).toEqual({ total: 1 });
    });

    it('should delegate getPublicPlans to service', async () => {
      const spy = jest.spyOn(service, 'getPublicCreatorPlans').mockResolvedValue([]);
      const res = await controller.getPublicPlans('creator-1');
      expect(spy).toHaveBeenCalledWith('creator-1');
      expect(res).toEqual([]);
    });

    it('should delegate updatePlan to service', async () => {
      const dto = { title: 'Updated Title' };
      const spy = jest.spyOn(service, 'updatePlan').mockResolvedValue({ id: 'plan-1' } as any);
      const res = await controller.updatePlan('user-1', 'plan-1', dto);
      expect(spy).toHaveBeenCalledWith('user-1', 'plan-1', dto);
      expect(res).toEqual({ id: 'plan-1' });
    });

    it('should delegate deletePlan to service', async () => {
      const spy = jest.spyOn(service, 'deletePlan').mockResolvedValue({ id: 'plan-1', status: CreatorPlanStatus.ARCHIVED } as any);
      const res = await controller.deletePlan('user-1', 'plan-1');
      expect(spy).toHaveBeenCalledWith('user-1', 'plan-1');
      expect(res.status).toBe(CreatorPlanStatus.ARCHIVED);
    });

    it('should delegate subscribe to service', async () => {
      const dto = { planId: 'plan-1' };
      const spy = jest.spyOn(service, 'subscribeToCreator').mockResolvedValue({ id: 'sub-1' } as any);
      const res = await controller.subscribe('user-1', 'creator-1', dto);
      expect(spy).toHaveBeenCalledWith('user-1', 'creator-1', dto);
      expect(res).toEqual({ id: 'sub-1' });
    });

    it('should delegate getMySubscriptions to service', async () => {
      const spy = jest.spyOn(service, 'getUserSubscriptions').mockResolvedValue({ total: 0 } as any);
      const res = await controller.getMySubscriptions('user-1', {});
      expect(spy).toHaveBeenCalledWith('user-1', {});
      expect(res).toEqual({ total: 0 });
    });

    it('should delegate getSubscribers to service', async () => {
      const spy = jest.spyOn(service, 'getCreatorSubscribers').mockResolvedValue({ total: 0 } as any);
      const res = await controller.getSubscribers('user-1', {});
      expect(spy).toHaveBeenCalledWith('user-1', {});
      expect(res).toEqual({ total: 0 });
    });

    it('should delegate getEarnings to service', async () => {
      const spy = jest.spyOn(service, 'getEarningsOverview').mockResolvedValue({ totalSubscribers: 10 } as any);
      const res = await controller.getEarnings('user-1');
      expect(spy).toHaveBeenCalledWith('user-1');
      expect(res).toEqual({ totalSubscribers: 10 });
    });

    it('should delegate submitPayoutRequest to service', async () => {
      const dto = { diamondAmount: 1000, payoutMethod: PayoutMethod.BANK_TRANSFER };
      const spy = jest.spyOn(service, 'submitPayoutRequest').mockResolvedValue({ id: 'payout-1' } as any);
      const res = await controller.submitPayoutRequest('user-1', dto);
      expect(spy).toHaveBeenCalledWith('user-1', dto);
      expect(res).toEqual({ id: 'payout-1' });
    });

    it('should delegate getPayoutRequests to service', async () => {
      const spy = jest.spyOn(service, 'getCreatorPayoutRequests').mockResolvedValue({ total: 0 } as any);
      const res = await controller.getPayoutRequests('user-1', {});
      expect(spy).toHaveBeenCalledWith('user-1', {});
      expect(res).toEqual({ total: 0 });
    });

    it('should delegate getPayoutRequestById to service', async () => {
      const spy = jest.spyOn(service, 'getPayoutRequestById').mockResolvedValue({ id: 'payout-1' } as any);
      const res = await controller.getPayoutRequestById('user-1', 'payout-1');
      expect(spy).toHaveBeenCalledWith('user-1', 'payout-1');
      expect(res).toEqual({ id: 'payout-1' });
    });
  });
});
