import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AgenciesService } from './agencies.service';
import { Agency, AgencyStatus } from './entities/agency.entity';
import { AgencyMember, AgencyRole } from './entities/agency-member.entity';
import {
  AgencyInvitation,
  InvitationStatus,
} from './entities/agency-invitation.entity';
import {
  AgencyApplication,
  ApplicationStatus,
} from './entities/agency-application.entity';
import {
  AgencyContract,
  ContractStatus,
  CommissionModel,
} from './entities/agency-contract.entity';
import {
  AgencySettlement,
  SettlementStatus,
} from './entities/agency-settlement.entity';
import {
  AgencyReward,
  AgencyRewardType,
} from './entities/agency-reward.entity';
import { AgencyAuditLog } from './entities/agency-audit-log.entity';

import { EventsGateway } from '../../common/events/events.gateway';
import { StorageService } from '../storage/storage.service';
import { RedisService } from '../../redis/redis.service';

describe('AgenciesService - Phase 26 Agency System', () => {
  let service: AgenciesService;

  const mockRepository = () => ({
    create: jest.fn((dto) => ({ id: 'mock-uuid-1', ...dto })),
    save: jest.fn((entity) =>
      Promise.resolve({ id: entity.id || 'mock-uuid-1', ...entity }),
    ),
    find: jest.fn(() => Promise.resolve([])),
    findOne: jest.fn(() => Promise.resolve(null)),
    remove: jest.fn((e) => Promise.resolve(e)),
    delete: jest.fn(() => Promise.resolve({ affected: 1 })),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    })),
  });

  const mockEventsGateway = {
    broadcastAgencyEvent: jest.fn(),
  };

  const mockStorageService = {
    uploadFile: jest
      .fn()
      .mockResolvedValue({ publicUrl: 'https://cdn.example.com/file.png' }),
  };

  const mockRedisService = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
  };

  let agencyRepo: any;
  let memberRepo: any;
  let applicationRepo: any;
  let contractRepo: any;
  let settlementRepo: any;
  let rewardRepo: any;
  let auditRepo: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgenciesService,
        { provide: getRepositoryToken(Agency), useFactory: mockRepository },
        {
          provide: getRepositoryToken(AgencyMember),
          useFactory: mockRepository,
        },
        {
          provide: getRepositoryToken(AgencyInvitation),
          useFactory: mockRepository,
        },
        {
          provide: getRepositoryToken(AgencyApplication),
          useFactory: mockRepository,
        },
        {
          provide: getRepositoryToken(AgencyContract),
          useFactory: mockRepository,
        },
        {
          provide: getRepositoryToken(AgencySettlement),
          useFactory: mockRepository,
        },
        {
          provide: getRepositoryToken(AgencyReward),
          useFactory: mockRepository,
        },
        {
          provide: getRepositoryToken(AgencyAuditLog),
          useFactory: mockRepository,
        },
        { provide: EventsGateway, useValue: mockEventsGateway },
        { provide: StorageService, useValue: mockStorageService },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<AgenciesService>(AgenciesService);
    agencyRepo = module.get(getRepositoryToken(Agency));
    memberRepo = module.get(getRepositoryToken(AgencyMember));
    applicationRepo = module.get(getRepositoryToken(AgencyApplication));
    contractRepo = module.get(getRepositoryToken(AgencyContract));
    settlementRepo = module.get(getRepositoryToken(AgencySettlement));
    rewardRepo = module.get(getRepositoryToken(AgencyReward));
    auditRepo = module.get(getRepositoryToken(AgencyAuditLog));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Agency Application & Verification', () => {
    it('should submit an agency application', async () => {
      const dto = {
        agencyName: 'Star Media Agency',
        legalName: 'Star Media LLC',
        taxId: 'TAX-12345',
        businessRegistrationNumber: 'REG-9988',
        businessAddress: '100 Broadway, NY',
        contactEmail: 'agency@starlight.com',
        contactPhone: '+123456789',
        country: 'United States',
      };

      const result = await service.applyForAgency('user-owner-1', dto);
      expect(result).toBeDefined();
      expect(applicationRepo.save).toHaveBeenCalled();
      expect(agencyRepo.save).toHaveBeenCalled();
      expect(mockEventsGateway.broadcastAgencyEvent).toHaveBeenCalledWith(
        'agency:application_submitted',
        expect.any(Object),
      );
    });

    it('should approve an agency application', async () => {
      const mockApp = {
        id: 'app-1',
        ownerId: 'user-owner-1',
        agencyName: 'Star Media Agency',
        status: ApplicationStatus.PENDING,
      };
      applicationRepo.findOne.mockResolvedValue(mockApp);

      const mockAgency = {
        id: 'agency-1',
        name: 'Star Media Agency',
        ownerId: 'user-owner-1',
        status: AgencyStatus.PENDING_VERIFICATION,
      };
      agencyRepo.findOne.mockResolvedValue(mockAgency);

      const result = await service.reviewApplication('app-1', 'admin-1', {
        status: ApplicationStatus.APPROVED,
        reviewNotes: 'Verified legal documents.',
      });

      expect(result.status).toBe(ApplicationStatus.APPROVED);
      expect(agencyRepo.save).toHaveBeenCalled();
      expect(mockEventsGateway.broadcastAgencyEvent).toHaveBeenCalledWith(
        'agency:status_updated',
        expect.objectContaining({ isVerified: true }),
      );
    });

    it('should suspend and reactivate agency', async () => {
      const mockAgency = { id: 'agency-1', status: AgencyStatus.ACTIVE };
      agencyRepo.findOne.mockResolvedValue(mockAgency);

      const suspended = await service.suspendAgency(
        'agency-1',
        'admin-1',
        'Policy violation',
      );
      expect(suspended.status).toBe(AgencyStatus.SUSPENDED);

      const reactivated = await service.reactivateAgency('agency-1', 'admin-1');
      expect(reactivated.status).toBe(AgencyStatus.ACTIVE);
    });
  });

  describe('Host Recruitment & Contracts', () => {
    it('should recruit a host and create contract', async () => {
      agencyRepo.findOne.mockResolvedValue({ id: 'agency-1' });
      memberRepo.findOne.mockResolvedValue({
        agencyId: 'agency-1',
        userId: 'manager-1',
        role: AgencyRole.MANAGER,
      });
      contractRepo.findOne.mockResolvedValue(null);

      const contract = await service.recruitHost('agency-1', 'manager-1', {
        hostUserId: 'host-user-1',
        commissionModel: CommissionModel.FIXED_PERCENTAGE,
        commissionRate: 15.0,
      });

      expect(contract).toBeDefined();
      expect(contractRepo.save).toHaveBeenCalled();
      expect(mockEventsGateway.broadcastAgencyEvent).toHaveBeenCalledWith(
        'agency:host_recruited',
        expect.any(Object),
      );
    });

    it('should accept host contract and activate membership', async () => {
      const mockContract = {
        id: 'contract-1',
        agencyId: 'agency-1',
        hostUserId: 'host-user-1',
        status: ContractStatus.PENDING_SIGNATURE,
      };
      contractRepo.findOne.mockResolvedValue(mockContract);
      agencyRepo.findOne.mockResolvedValue({
        id: 'agency-1',
        totalHosts: 0,
        activeHosts: 0,
      });
      memberRepo.findOne.mockResolvedValue(null);

      const activated = await service.acceptHostContract(
        'contract-1',
        'host-user-1',
      );
      expect(activated.status).toBe(ContractStatus.ACTIVE);
      expect(agencyRepo.save).toHaveBeenCalled();
    });
  });

  describe('Revenue & Monthly Settlements', () => {
    it('should calculate monthly settlement for agency', async () => {
      const mockAgency = {
        id: 'agency-1',
        totalRevenue: 10000,
        commissionRate: 15,
      };
      agencyRepo.findOne.mockResolvedValue(mockAgency);
      contractRepo.find.mockResolvedValue([
        { totalGiftsReceived: 5000 },
        { totalGiftsReceived: 5000 },
      ]);
      settlementRepo.findOne.mockResolvedValue(null);

      const settlement = await service.calculateMonthlySettlement(
        'agency-1',
        '2026-07',
      );
      expect(settlement.grossRevenue).toBeGreaterThan(0);
      expect(settlement.agencyCommission).toBeGreaterThan(0);
      expect(settlementRepo.save).toHaveBeenCalled();
    });

    it('should process agency settlement payout', async () => {
      const mockSettlement = {
        id: 'settlement-1',
        agencyId: 'agency-1',
        status: SettlementStatus.PENDING,
      };
      settlementRepo.findOne.mockResolvedValue(mockSettlement);

      const processed = await service.processSettlement(
        'settlement-1',
        'admin-1',
        {
          status: SettlementStatus.COMPLETED,
          paymentReference: 'REF-BANK-8821',
        },
      );

      expect(processed.status).toBe(SettlementStatus.COMPLETED);
      expect(mockEventsGateway.broadcastAgencyEvent).toHaveBeenCalledWith(
        'agency:settlement_processed',
        expect.any(Object),
      );
    });
  });

  describe('Analytics & Leaderboards', () => {
    it('should return agency analytics and cache in Redis', async () => {
      agencyRepo.findOne.mockResolvedValue({
        id: 'agency-1',
        name: 'Star Media',
        totalRevenue: 15000,
        totalHosts: 10,
        activeHosts: 8,
      });
      memberRepo.find.mockResolvedValue([{ id: 'm1' }, { id: 'm2' }]);
      contractRepo.find.mockResolvedValue([]);

      const analytics = await service.getAgencyAnalytics('agency-1');
      expect(analytics).toBeDefined();
      expect(mockRedisService.set).toHaveBeenCalled();
    });

    it('should return top leaderboard rankings', async () => {
      agencyRepo.find.mockResolvedValue([
        { id: 'agency-1', name: 'Star Media', totalRevenue: 50000 },
        { id: 'agency-2', name: 'Apex Talent', totalRevenue: 30000 },
      ]);

      const leaderboard = await service.getLeaderboard('revenue');
      expect(leaderboard.length).toBe(2);
      expect(mockRedisService.set).toHaveBeenCalledWith(
        'agency:rankings:revenue',
        expect.any(String),
        300,
      );
    });
  });

  describe('Rewards & Milestone Claims', () => {
    it('should claim agency reward', async () => {
      const mockReward = {
        id: 'reward-1',
        agencyId: 'agency-1',
        isClaimed: false,
        rewardAmount: 1000,
      };
      rewardRepo.findOne.mockResolvedValue(mockReward);

      const claimed = await service.claimAgencyReward(
        'agency-1',
        'reward-1',
        'owner-1',
      );
      expect(claimed.isClaimed).toBe(true);
      expect(mockEventsGateway.broadcastAgencyEvent).toHaveBeenCalledWith(
        'agency:reward_claimed',
        expect.any(Object),
      );
    });
  });
});
