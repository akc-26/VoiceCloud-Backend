import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { maskIdentityNumber } from '../../common/utils/masking.util';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../../common/enums';
import {
  HostProfile,
  HostVerificationStatus,
} from './entities/host-profile.entity';
import {
  MapperUtils,
  PublicHostResponseDto,
  OwnerHostResponseDto,
  AdminHostResponseDto,
} from './dto/host-response.dto';
import { HostsService } from './hosts.service';

describe('Host Security and Privacy Unit Tests', () => {
  describe('1. Identity Masking Utility', () => {
    it('should handle empty or null inputs gracefully', () => {
      expect(maskIdentityNumber('')).toBe('');
      expect(maskIdentityNumber(null as any)).toBe('');
      expect(maskIdentityNumber(undefined as any)).toBe('');
    });

    it('should mask identity numbers leaving only last 4 visible', () => {
      expect(maskIdentityNumber('1234567890')).toBe('••••••7890');
      expect(maskIdentityNumber('A1234567')).toBe('••••4567');
      expect(maskIdentityNumber('1234')).toBe('1234');
      expect(maskIdentityNumber('12')).toBe('••');
    });
  });

  describe('2. RolesGuard Authorization', () => {
    let rolesGuard: RolesGuard;
    let reflector: Reflector;

    beforeEach(() => {
      reflector = new Reflector();
      rolesGuard = new RolesGuard(reflector);
    });

    it('should allow access if no roles required', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
      const context = {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({
            user: { userId: 'u-1', role: UserRole.USER },
          }),
        }),
      } as any;

      expect(rolesGuard.canActivate(context)).toBe(true);
    });

    it('should reject access if user lacks required admin role', () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([UserRole.ADMIN, UserRole.SUPER_ADMIN]);
      const context = {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({
            user: {
              userId: 'u-1',
              role: UserRole.USER,
              roles: [UserRole.USER],
            },
          }),
        }),
      } as any;

      expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should allow access if user has ADMIN or SUPER_ADMIN role', () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([UserRole.ADMIN, UserRole.SUPER_ADMIN]);

      const adminContext = {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({
            user: {
              userId: 'admin-1',
              role: UserRole.ADMIN,
              roles: [UserRole.ADMIN],
            },
          }),
        }),
      } as any;

      expect(rolesGuard.canActivate(adminContext)).toBe(true);

      const superAdminContext = {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({
            user: {
              userId: 'superadmin-1',
              role: UserRole.SUPER_ADMIN,
              roles: [UserRole.SUPER_ADMIN],
            },
          }),
        }),
      } as any;

      expect(rolesGuard.canActivate(superAdminContext)).toBe(true);
    });
  });

  describe('3. Response Privacy DTO Mappers', () => {
    const mockHost: HostProfile = {
      id: 'host-uuid-1',
      userId: 'user-uuid-1',
      realName: 'John Host',
      idNumber: '9876543210',
      documentUrl: 'https://s3.cloud/private/gov-id-123.pdf',
      selfieUrl: 'https://s3.cloud/private/selfie-123.jpg',
      bio: 'Professional host',
      languages: ['EN', 'ES'],
      categories: ['Music'],
      country: 'US',
      experience: '2 years',
      isFeatured: false,
      availabilitySchedule: null,
      status: HostVerificationStatus.APPROVED,
      hostLevel: 3,
      xp: 1500,
      performanceScore: 92.5,
      growthMilestones: 'badge1,badge2',
      hostRating: 4.8,
      totalRatings: 50,
      followersCount: 1200,
      totalRoomsHosted: 45,
      peakListeners: 300,
      totalSpeakingTimeMinutes: 500,
      totalAudience: 5000,
      rejectionReason: null,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-02'),
    };

    it('should sanitize public response DTO removing raw identity and document URLs', () => {
      const publicDto = MapperUtils.toPublicHostDto(mockHost);

      expect(publicDto).not.toHaveProperty('idNumber');
      expect(publicDto).not.toHaveProperty('documentUrl');
      expect(publicDto).not.toHaveProperty('selfieUrl');
      expect(publicDto).not.toHaveProperty('rejectionReason');
      expect(publicDto.id).toBe('host-uuid-1');
      expect(publicDto.userId).toBe('user-uuid-1');
      expect(publicDto.verificationBadge).toBe(true);
      expect(publicDto.achievements).toEqual(['badge1', 'badge2']);
    });

    it('should sanitize owner response DTO masking identity number and hiding raw document URLs', () => {
      const ownerDto = MapperUtils.toOwnerHostDto(mockHost);

      expect(ownerDto.idNumber).toBe('••••••3210');
      expect(ownerDto).not.toHaveProperty('documentUrl');
      expect(ownerDto).not.toHaveProperty('selfieUrl');
      expect(ownerDto.hasGovernmentIdUploaded).toBe(true);
      expect(ownerDto.hasProfilePhotoUploaded).toBe(true);
    });

    it('should format admin response DTO with masked ID number by default and raw URLs for review', () => {
      const adminDto = MapperUtils.toAdminHostDto(mockHost, true);

      expect(adminDto.idNumber).toBe('••••••3210');
      expect(adminDto.documentUrl).toBe(
        'https://s3.cloud/private/gov-id-123.pdf',
      );
      expect(adminDto.selfieUrl).toBe(
        'https://s3.cloud/private/selfie-123.jpg',
      );

      const adminUnmaskedDto = MapperUtils.toAdminHostDto(mockHost, false);
      expect(adminUnmaskedDto.idNumber).toBe('9876543210');
    });
  });

  describe('4. Creator Self-Approval Protection in HostsService', () => {
    let service: HostsService;
    let mockHostRepo: any;
    let mockAuditRepo: any;
    let mockEarningsRepo: any;
    let mockPerfRepo: any;
    let mockRoomRepo: any;
    let mockIncidentRepo: any;
    let mockRewardRepo: any;
    let mockEventsGateway: any;

    const mockHost: HostProfile = {
      id: 'host-101',
      userId: 'creator-admin-1',
      realName: 'Creator Admin',
      idNumber: '1111222233',
      documentUrl: 'doc.pdf',
      selfieUrl: 'selfie.jpg',
      bio: 'Admin who is also a creator',
      languages: [],
      categories: [],
      country: 'US',
      experience: null,
      isFeatured: false,
      availabilitySchedule: null,
      status: HostVerificationStatus.PENDING,
      hostLevel: 1,
      xp: 0,
      performanceScore: 0,
      growthMilestones: null,
      hostRating: 5,
      totalRatings: 0,
      followersCount: 0,
      totalRoomsHosted: 0,
      peakListeners: 0,
      totalSpeakingTimeMinutes: 0,
      totalAudience: 0,
      rejectionReason: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(() => {
      mockHostRepo = {
        findOne: jest.fn().mockImplementation(({ where }) => {
          if (where.id === 'host-101' || where.userId === 'creator-admin-1') {
            return Promise.resolve(mockHost);
          }
          return Promise.resolve(null);
        }),
        save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
      };
      mockAuditRepo = {
        create: jest.fn().mockImplementation((dto) => dto),
        save: jest.fn().mockImplementation((dto) => Promise.resolve(dto)),
      };
      mockEarningsRepo = {
        findOne: jest.fn().mockResolvedValue({
          hostProfileId: 'host-101',
          pendingSettlements: 100,
          completedSettlements: 0,
        }),
        save: jest.fn().mockImplementation((dto) => Promise.resolve(dto)),
      };
      mockPerfRepo = {};
      mockRoomRepo = {};
      mockIncidentRepo = {};
      mockRewardRepo = {
        create: jest.fn().mockImplementation((dto) => dto),
        save: jest.fn().mockImplementation((dto) => Promise.resolve(dto)),
      };
      mockEventsGateway = {
        broadcastHostEvent: jest.fn(),
      };
      const mockStorageService: any = {
        uploadFile: jest
          .fn()
          .mockResolvedValue('https://s3.cloud/uploaded.png'),
      };

      service = new HostsService(
        mockHostRepo,
        mockAuditRepo,
        mockEarningsRepo,
        mockPerfRepo,
        mockRoomRepo,
        mockIncidentRepo,
        mockRewardRepo,
        mockEventsGateway,
        mockStorageService,
      );
    });

    it('should reject approveHost when admin approves their own creator profile', async () => {
      await expect(
        service.approveHost('host-101', 'creator-admin-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject rejectHost when admin rejects their own creator profile', async () => {
      await expect(
        service.rejectHost('host-101', 'Reason', 'creator-admin-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject suspendHost when admin suspends their own creator profile', async () => {
      await expect(
        service.suspendHost('host-101', 'creator-admin-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject reactivateHost when admin reactivates their own creator profile', async () => {
      await expect(
        service.reactivateHost('host-101', 'creator-admin-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject grantReward when admin grants reward to their own creator profile', async () => {
      await expect(
        service.grantReward(
          'host-101',
          'Bonus',
          50,
          'BONUS',
          'DIAMONDS',
          'creator-admin-1',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject completeSettlement when admin completes payout for their own creator profile', async () => {
      await expect(
        service.completeSettlement('host-101', 100, 'creator-admin-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow approveHost when performed by a different administrator', async () => {
      const result = await service.approveHost(
        'host-101',
        'different-admin-999',
      );
      expect(result.status).toBe(HostVerificationStatus.APPROVED);
      expect(mockHostRepo.save).toHaveBeenCalled();
    });
  });
});
