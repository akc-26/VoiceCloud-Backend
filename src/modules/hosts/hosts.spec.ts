import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { HostsService } from './hosts.service';
import {
  HostProfile,
  HostVerificationStatus,
} from './entities/host-profile.entity';
import { HostAuditNote } from './entities/host-audit-note.entity';
import { HostEarnings } from './entities/host-earnings.entity';
import { HostPerformance } from './entities/host-performance.entity';
import { HostRoom } from './entities/host-room.entity';
import { HostIncidentLog } from './entities/host-incident-log.entity';
import { HostReward } from './entities/host-reward.entity';
import { EventsGateway } from '../../common/events/events.gateway';
import { StorageService } from '../storage/storage.service';
import { HostEligibilityService } from './host-eligibility.service';
import { HostLevelConfigService } from './host-level-config.service';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';

describe('HostsService (Phase 25)', () => {
  let service: HostsService;

  const mockHostProfile: Partial<HostProfile> = {
    id: 'host-uuid-1',
    userId: 'user-uuid-1',
    realName: 'John Doe',
    idNumber: 'ID-123456',
    documentUrl: 'https://cdn.example.com/doc.jpg',
    selfieUrl: 'https://cdn.example.com/selfie.jpg',
    status: HostVerificationStatus.APPROVED,
    hostLevel: 1,
    xp: 500,
    performanceScore: 90,
  };

  const mockHostRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest
      .fn()
      .mockImplementation((dto) => ({ id: 'host-uuid-1', ...dto })),
    save: jest
      .fn()
      .mockImplementation((entity) =>
        Promise.resolve({ id: 'host-uuid-1', ...entity }),
      ),
    createQueryBuilder: jest.fn().mockReturnValue({
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([mockHostProfile]),
    }),
  };

  const mockAuditNoteRepository = {
    create: jest
      .fn()
      .mockImplementation((dto) => ({ id: 'note-uuid-1', ...dto })),
    save: jest
      .fn()
      .mockImplementation((entity) =>
        Promise.resolve({ id: 'note-uuid-1', ...entity }),
      ),
    find: jest.fn().mockResolvedValue([]),
  };

  const mockEarningsRepository = {
    findOne: jest.fn(),
    create: jest
      .fn()
      .mockImplementation((dto) => ({ id: 'earnings-uuid-1', ...dto })),
    save: jest
      .fn()
      .mockImplementation((entity) =>
        Promise.resolve({ id: 'earnings-uuid-1', ...entity }),
      ),
    find: jest.fn().mockResolvedValue([]),
  };

  const mockPerformanceRepository = {
    findOne: jest.fn(),
    create: jest
      .fn()
      .mockImplementation((dto) => ({ id: 'perf-uuid-1', ...dto })),
    save: jest
      .fn()
      .mockImplementation((entity) =>
        Promise.resolve({ id: 'perf-uuid-1', ...entity }),
      ),
    find: jest.fn().mockResolvedValue([]),
  };

  const mockRoomRepository = {
    findOne: jest.fn(),
    create: jest
      .fn()
      .mockImplementation((dto) => ({ id: 'room-uuid-1', ...dto })),
    save: jest
      .fn()
      .mockImplementation((entity) =>
        Promise.resolve({ id: 'room-uuid-1', ...entity }),
      ),
    find: jest.fn().mockResolvedValue([]),
  };

  const mockIncidentRepository = {
    create: jest
      .fn()
      .mockImplementation((dto) => ({ id: 'incident-uuid-1', ...dto })),
    save: jest
      .fn()
      .mockImplementation((entity) =>
        Promise.resolve({ id: 'incident-uuid-1', ...entity }),
      ),
    find: jest.fn().mockResolvedValue([]),
  };

  const mockRewardRepository = {
    findOne: jest.fn(),
    create: jest
      .fn()
      .mockImplementation((dto) => ({ id: 'reward-uuid-1', ...dto })),
    save: jest
      .fn()
      .mockImplementation((entity) =>
        Promise.resolve({ id: 'reward-uuid-1', ...entity }),
      ),
    find: jest.fn().mockResolvedValue([]),
  };

  const mockEventsGateway = {
    broadcastHostEvent: jest.fn(),
  };

  const mockStorageService = {
    uploadFile: jest
      .fn()
      .mockResolvedValue({ publicUrl: 'https://cdn.example.com/file.jpg' }),
  };

  const mockHostEligibilityService = {
    evaluate: jest.fn(),
    assertEligible: jest.fn().mockResolvedValue({ eligible: true }),
  };

  const hostLevelDefinitions = [
    { level: 1, name: 'Starter Host', minimumXp: 0, benefits: [] },
    { level: 2, name: 'Rising Host', minimumXp: 1000, benefits: [] },
    { level: 3, name: 'Established Host', minimumXp: 5000, benefits: [] },
    { level: 4, name: 'Elite Host', minimumXp: 15000, benefits: [] },
    { level: 5, name: 'Premier Host', minimumXp: 50000, benefits: [] },
  ];

  const mockHostLevelConfigService = {
    getDefinitions: jest.fn().mockResolvedValue(hostLevelDefinitions),
    getLevelForXp: jest.fn((definitions, xp) =>
      [...definitions].reverse().find((definition) => xp >= definition.minimumXp),
    ),
    getNextLevel: jest.fn((definitions, currentLevel) =>
      definitions.find((definition) => definition.level > currentLevel) || null,
    ),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HostsService,
        {
          provide: getRepositoryToken(HostProfile),
          useValue: mockHostRepository,
        },
        {
          provide: getRepositoryToken(HostAuditNote),
          useValue: mockAuditNoteRepository,
        },
        {
          provide: getRepositoryToken(HostEarnings),
          useValue: mockEarningsRepository,
        },
        {
          provide: getRepositoryToken(HostPerformance),
          useValue: mockPerformanceRepository,
        },
        { provide: getRepositoryToken(HostRoom), useValue: mockRoomRepository },
        {
          provide: getRepositoryToken(HostIncidentLog),
          useValue: mockIncidentRepository,
        },
        {
          provide: getRepositoryToken(HostReward),
          useValue: mockRewardRepository,
        },
        { provide: EventsGateway, useValue: mockEventsGateway },
        { provide: StorageService, useValue: mockStorageService },
        {
          provide: HostEligibilityService,
          useValue: mockHostEligibilityService,
        },
        {
          provide: HostLevelConfigService,
          useValue: mockHostLevelConfigService,
        },
      ],
    }).compile();

    service = module.get<HostsService>(HostsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('applyForVerification', () => {
    describe('1. New Application Requirements', () => {
      it('should submit application when user is not existing host and all required fields are provided', async () => {
        mockHostRepository.findOne.mockResolvedValue(null);
        const dto = {
          realName: 'Jane Smith',
          idNumber: 'ID-999',
          documentUrl: 'https://cdn.example.com/doc.jpg',
          selfieUrl: 'https://cdn.example.com/selfie.jpg',
        };

        const result = await service.applyForVerification('user-uuid-9', dto);
        expect(result).toBeDefined();
        expect(result.status).toEqual(HostVerificationStatus.PENDING);
        expect(result.idNumber).toEqual('ID-999');
        expect(result.documentUrl).toEqual('https://cdn.example.com/doc.jpg');
        expect(result.selfieUrl).toEqual('https://cdn.example.com/selfie.jpg');
      });

      it('should throw BadRequestException if new application is missing ID number', async () => {
        mockHostRepository.findOne.mockResolvedValue(null);
        await expect(
          service.applyForVerification('user-uuid-9', {
            realName: 'Jane Smith',
            idNumber: '',
            documentUrl: 'https://cdn.example.com/doc.jpg',
            selfieUrl: 'https://cdn.example.com/selfie.jpg',
          }),
        ).rejects.toThrow(BadRequestException);
      });

      it('should throw BadRequestException if new application is missing government ID document', async () => {
        mockHostRepository.findOne.mockResolvedValue(null);
        await expect(
          service.applyForVerification('user-uuid-9', {
            realName: 'Jane Smith',
            idNumber: 'ID-999',
            documentUrl: '',
            selfieUrl: 'https://cdn.example.com/selfie.jpg',
          }),
        ).rejects.toThrow(BadRequestException);
      });

      it('should throw BadRequestException if new application is missing selfie photo', async () => {
        mockHostRepository.findOne.mockResolvedValue(null);
        await expect(
          service.applyForVerification('user-uuid-9', {
            realName: 'Jane Smith',
            idNumber: 'ID-999',
            documentUrl: 'https://cdn.example.com/doc.jpg',
            selfieUrl: '',
          }),
        ).rejects.toThrow(BadRequestException);
      });

      it('should throw ConflictException if host is already approved', async () => {
        mockHostRepository.findOne.mockResolvedValue({
          ...mockHostProfile,
          status: HostVerificationStatus.APPROVED,
        });
        await expect(
          service.applyForVerification('user-uuid-1', {
            realName: 'Jane',
            idNumber: 'ID',
            documentUrl: 'doc',
            selfieUrl: 'selfie',
          }),
        ).rejects.toThrow(ConflictException);
      });
    });

    describe('2. Reapplication Requirements', () => {
      const getRejectedHost = () => ({
        ...mockHostProfile,
        id: 'host-rejected-1',
        userId: 'user-rejected-1',
        idNumber: 'ORIGINAL-ID-123',
        documentUrl: 'https://cdn.example.com/stored-doc.jpg',
        selfieUrl: 'https://cdn.example.com/stored-selfie.jpg',
        status: HostVerificationStatus.REJECTED,
      });

      it('should allow reapplication reusing valid stored identity and documents when blank replacement fields are supplied', async () => {
        mockHostRepository.findOne.mockResolvedValue(getRejectedHost());

        const result = await service.applyForVerification('user-rejected-1', {
          realName: 'Jane Reapplicant',
          idNumber: '',
          documentUrl: '',
          selfieUrl: '',
        });

        expect(result.status).toEqual(HostVerificationStatus.PENDING);
        expect(result.idNumber).toEqual('ORIGINAL-ID-123');
        expect(result.documentUrl).toEqual('https://cdn.example.com/stored-doc.jpg');
        expect(result.selfieUrl).toEqual('https://cdn.example.com/stored-selfie.jpg');
      });

      it('should replace stored identity number with newly supplied valid replacement identity', async () => {
        mockHostRepository.findOne.mockResolvedValue(getRejectedHost());

        const result = await service.applyForVerification('user-rejected-1', {
          realName: 'Jane Reapplicant',
          idNumber: 'NEW-VALID-ID-999',
          documentUrl: '',
          selfieUrl: '',
        });

        expect(result.status).toEqual(HostVerificationStatus.PENDING);
        expect(result.idNumber).toEqual('NEW-VALID-ID-999');
        expect(result.documentUrl).toEqual('https://cdn.example.com/stored-doc.jpg');
      });

      it('should throw BadRequestException if both submitted and stored required values are missing', async () => {
        const brokenRejectedHost = {
          ...getRejectedHost(),
          idNumber: '',
          documentUrl: '',
          selfieUrl: '',
        };
        mockHostRepository.findOne.mockResolvedValue(brokenRejectedHost);

        await expect(
          service.applyForVerification('user-rejected-1', {
            realName: 'Jane Reapplicant',
            idNumber: '',
            documentUrl: '',
            selfieUrl: '',
          }),
        ).rejects.toThrow(BadRequestException);
      });

      it('should not persist mask placeholders during reapplication', async () => {
        mockHostRepository.findOne.mockResolvedValue(getRejectedHost());

        await expect(
          service.applyForVerification('user-rejected-1', {
            realName: 'Jane Reapplicant',
            idNumber: '••••••3210',
            documentUrl: '',
            selfieUrl: '',
          }),
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('3. Mask Validation in Service Path', () => {
      it('should reject identity values containing asterisk (*)', async () => {
        mockHostRepository.findOne.mockResolvedValue(null);
        await expect(
          service.applyForVerification('user-1', {
            realName: 'Jane',
            idNumber: '1234****5678',
            documentUrl: 'https://doc.jpg',
            selfieUrl: 'https://selfie.jpg',
          }),
        ).rejects.toThrow(BadRequestException);
      });

      it('should reject identity values containing bullet (•)', async () => {
        mockHostRepository.findOne.mockResolvedValue(null);
        await expect(
          service.applyForVerification('user-1', {
            realName: 'Jane',
            idNumber: '••••••7890',
            documentUrl: 'https://doc.jpg',
            selfieUrl: 'https://selfie.jpg',
          }),
        ).rejects.toThrow(BadRequestException);
      });

      it('should reject identity values containing black circle (●)', async () => {
        mockHostRepository.findOne.mockResolvedValue(null);
        await expect(
          service.applyForVerification('user-1', {
            realName: 'Jane',
            idNumber: '●●●●●●7890',
            documentUrl: 'https://doc.jpg',
            selfieUrl: 'https://selfie.jpg',
          }),
        ).rejects.toThrow(BadRequestException);
      });
    });
  });

  describe('approveHost / rejectHost / suspendHost', () => {
    it('should approve host application and broadcast event', async () => {
      mockHostRepository.findOne.mockResolvedValue({
        id: 'host-1',
        userId: 'user-1',
        status: HostVerificationStatus.PENDING,
      });

      const approved = await service.approveHost('host-1', 'admin-1');
      expect(approved.status).toEqual(HostVerificationStatus.APPROVED);
      expect(mockEventsGateway.broadcastHostEvent).toHaveBeenCalledWith(
        'host:verified',
        expect.anything(),
      );
    });

    it('should reject host application with reason', async () => {
      mockHostRepository.findOne.mockResolvedValue({
        id: 'host-1',
        userId: 'user-1',
        status: HostVerificationStatus.PENDING,
      });

      const rejected = await service.rejectHost(
        'host-1',
        'Incomplete documents',
        'admin-1',
      );
      expect(rejected.status).toEqual(HostVerificationStatus.REJECTED);
      expect(rejected.rejectionReason).toEqual('Incomplete documents');
    });

    it('should suspend host status', async () => {
      mockHostRepository.findOne.mockResolvedValue({
        id: 'host-1',
        userId: 'user-1',
        status: HostVerificationStatus.APPROVED,
      });

      const suspended = await service.suspendHost('host-1', 'admin-1');
      expect(suspended.status).toEqual(HostVerificationStatus.SUSPENDED);
    });
  });

  describe('XP and Level Progression', () => {
    it('should promote host level when XP reaches threshold', async () => {
      mockHostRepository.findOne.mockResolvedValue({
        ...mockHostProfile,
        hostLevel: 1,
        xp: 900,
      });

      const updated = await service.addXP('user-uuid-1', 200);
      expect(updated.hostLevel).toEqual(2);
      expect(mockEventsGateway.broadcastHostEvent).toHaveBeenCalledWith(
        'host:level_up',
        expect.anything(),
      );
    });

    it('returns configured level names, thresholds and benefits', async () => {
      mockHostRepository.findOne.mockResolvedValue({
        ...mockHostProfile,
        hostLevel: 2,
        xp: 1200,
      });

      const progression = await service.checkPromotionRequirements(
        'user-uuid-1',
      );
      expect(progression.currentLevelName).toBe('Rising Host');
      expect(progression.nextLevel).toBe(3);
      expect(progression.requiredXP).toBe(5000);
      expect(progression.isMaximumLevel).toBe(false);
    });
  });

  describe('Earnings and Settlements', () => {
    it('should record income and update lifetime earnings', async () => {
      mockHostRepository.findOne.mockResolvedValue(mockHostProfile);
      mockEarningsRepository.findOne.mockResolvedValue({
        hostProfileId: 'host-uuid-1',
        userId: 'user-uuid-1',
        dailyEarnings: 0,
        weeklyEarnings: 0,
        monthlyEarnings: 0,
        lifetimeEarnings: 0,
        pendingSettlements: 0,
        completedSettlements: 0,
        giftIncome: 0,
        vipBonusIncome: 0,
        roomBonusIncome: 0,
      });

      const result = await service.recordIncome('user-uuid-1', 100, 20, 10);
      expect(Number(result.lifetimeEarnings)).toEqual(130);
    });

    it('should throw BadRequestException if settlement amount exceeds available', async () => {
      mockHostRepository.findOne.mockResolvedValue(mockHostProfile);
      mockEarningsRepository.findOne.mockResolvedValue({
        hostProfileId: 'host-uuid-1',
        userId: 'user-uuid-1',
        lifetimeEarnings: 100,
        pendingSettlements: 0,
        completedSettlements: 50,
      });

      await expect(
        service.requestSettlement('user-uuid-1', 100),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Host Room Management', () => {
    it('should create host room for approved host', async () => {
      mockHostRepository.findOne.mockResolvedValue({
        ...mockHostProfile,
        status: HostVerificationStatus.APPROVED,
      });

      const room = await service.createHostRoom('user-uuid-1', {
        title: 'Acoustic Night',
        category: 'Music',
        type: 'INSTANT',
      });

      expect(room).toBeDefined();
      expect(room.title).toEqual('Acoustic Night');
    });

    it('should throw BadRequestException if non-approved host tries to create room', async () => {
      mockHostRepository.findOne.mockResolvedValue({
        ...mockHostProfile,
        status: HostVerificationStatus.PENDING,
      });

      await expect(
        service.createHostRoom('user-uuid-1', {
          title: 'Night Show',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
