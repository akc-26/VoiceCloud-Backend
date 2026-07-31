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
      ],
    }).compile();

    service = module.get<HostsService>(HostsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('applyForVerification', () => {
    it('should submit application when user is not existing host', async () => {
      mockHostRepository.findOne.mockResolvedValue(null);
      const dto = {
        realName: 'Jane Smith',
        idNumber: 'ID-999',
        documentUrl: 'https://doc.jpg',
        selfieUrl: 'https://selfie.jpg',
      };

      const result = await service.applyForVerification('user-uuid-9', dto);
      expect(result).toBeDefined();
      expect(result.status).toEqual(HostVerificationStatus.PENDING);
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
