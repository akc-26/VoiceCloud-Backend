import {
  INestApplication,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { maskIdentityNumber } from '../../common/utils/masking.util';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
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
import { HostsController } from './hosts.controller';
import { JwtTokenService } from '../auth/jwt-token.service';

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

  describe('5. HTTP Security & Response Privacy Endpoints', () => {
    let app: INestApplication;
    let mockHostsService: any;
    let mockJwtTokenService: any;

    const approvedHost: HostProfile = {
      id: 'approved-host-id',
      userId: 'approved-user-id',
      realName: 'Jane Verified',
      idNumber: '1234567890',
      documentUrl: 'https://s3.cloud/private/gov-id-approved.pdf',
      selfieUrl: 'https://s3.cloud/private/selfie-approved.jpg',
      bio: 'Verified host bio',
      languages: ['English'],
      categories: ['Talk Show'],
      country: 'US',
      experience: '3 years',
      isFeatured: true,
      availabilitySchedule: null,
      status: HostVerificationStatus.APPROVED,
      hostLevel: 2,
      xp: 800,
      performanceScore: 95,
      growthMilestones: null,
      hostRating: 4.9,
      totalRatings: 10,
      followersCount: 500,
      totalRoomsHosted: 20,
      peakListeners: 150,
      totalSpeakingTimeMinutes: 300,
      totalAudience: 2000,
      rejectionReason: null,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-02'),
    };

    const pendingHost: HostProfile = {
      ...approvedHost,
      id: 'pending-host-id',
      userId: 'pending-user-id',
      status: HostVerificationStatus.PENDING,
    };

    const selfApprovalHost: HostProfile = {
      ...approvedHost,
      id: 'creator-admin-host-id',
      userId: 'creator-admin-id',
      status: HostVerificationStatus.PENDING,
    };

    beforeAll(async () => {
      mockHostsService = {
        getApplications: jest.fn().mockResolvedValue([pendingHost]),
        getHostProfile: jest.fn().mockImplementation((userId: string) => {
          if (userId === 'approved-user-id')
            return Promise.resolve(approvedHost);
          if (userId === 'pending-user-id') return Promise.resolve(pendingHost);
          if (userId === 'creator-admin-id')
            return Promise.resolve(selfApprovalHost);
          throw new NotFoundException(
            `Host profile for user ${userId} not found`,
          );
        }),
        approveHost: jest
          .fn()
          .mockImplementation((id: string, adminId: string) => {
            if (
              id === 'creator-admin-host-id' &&
              adminId === 'creator-admin-id'
            ) {
              throw new ForbiddenException(
                'Administrators cannot approve their own host verification application',
              );
            }
            return Promise.resolve({ ...approvedHost, id });
          }),
        searchHosts: jest.fn().mockResolvedValue([approvedHost]),
      };

      mockJwtTokenService = {
        verifyAccessToken: jest.fn().mockImplementation((token: string) => {
          if (token === 'creator-token') {
            return Promise.resolve({
              userId: 'creator-1',
              role: UserRole.USER,
            });
          }
          if (token === 'approved-user-token') {
            return Promise.resolve({
              userId: 'approved-user-id',
              role: UserRole.USER,
            });
          }
          if (token === 'admin-token') {
            return Promise.resolve({ userId: 'admin-1', role: UserRole.ADMIN });
          }
          if (token === 'superadmin-token') {
            return Promise.resolve({
              userId: 'superadmin-1',
              role: UserRole.SUPER_ADMIN,
            });
          }
          if (token === 'creator-admin-token') {
            return Promise.resolve({
              userId: 'creator-admin-id',
              role: UserRole.ADMIN,
            });
          }
          throw new Error('Invalid token');
        }),
      };

      const moduleRef: TestingModule = await Test.createTestingModule({
        controllers: [HostsController],
        providers: [
          { provide: HostsService, useValue: mockHostsService },
          { provide: JwtTokenService, useValue: mockJwtTokenService },
          Reflector,
          JwtAuthGuard,
          RolesGuard,
        ],
      }).compile();

      app = moduleRef.createNestApplication();
      app.setGlobalPrefix('api/v1');
      await app.init();
    });

    afterAll(async () => {
      if (app) {
        await app.close();
      }
    });

    it('1. HTTP 401 when requesting /api/v1/hosts/admin/applications without token', async () => {
      const res = await request(app.getHttpServer()).get(
        '/api/v1/hosts/admin/applications',
      );
      expect(res.status).toBe(401);
    });

    it('2. HTTP 403 when Creator token requests Host admin endpoint', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/hosts/admin/applications')
        .set('Authorization', 'Bearer creator-token');
      expect(res.status).toBe(403);
    });

    it('3. HTTP 200 (Allowed) when Admin token requests Host admin endpoint', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/hosts/admin/applications')
        .set('Authorization', 'Bearer admin-token');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('4. HTTP 200 (Allowed) when Super Admin token requests Host admin endpoint', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/hosts/admin/applications')
        .set('Authorization', 'Bearer superadmin-token');
      expect(res.status).toBe(200);
    });

    it('5. HTTP 403 when Creator attempts self-approval', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/hosts/admin/approve/creator-admin-host-id')
        .set('Authorization', 'Bearer creator-admin-token');
      expect(res.status).toBe(403);
    });

    it('6. Public Host profile contains NO identity/document fields, storage paths, or review notes', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/hosts/profile/approved-user-id')
        .set('Authorization', 'Bearer creator-token');
      expect(res.status).toBe(200);
      const body = res.body;

      // Must NOT expose identity or document fields
      expect(body.idNumber).toBeUndefined();
      expect(body.documentUrl).toBeUndefined();
      expect(body.selfieUrl).toBeUndefined();
      expect(body.supportingDocumentUrls).toBeUndefined();
      expect(body.supportingDocumentAssetIds).toBeUndefined();
      expect(body.rejectionReason).toBeUndefined();
      expect(JSON.stringify(body)).not.toContain('s3.cloud');
      expect(JSON.stringify(body)).not.toContain('private');
    });

    it('7. Owner Host profile contains masked identity ONLY and NO document URLs or physical storage paths', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/hosts/profile')
        .set('Authorization', 'Bearer approved-user-token');
      expect(res.status).toBe(200);
      const body = res.body;

      expect(body.idNumber).toBe('••••••7890');
      expect(body.documentUrl).toBeUndefined();
      expect(body.selfieUrl).toBeUndefined();
      expect(body.supportingDocumentUrls).toBeUndefined();
      expect(body.supportingDocumentAssetIds).toBeUndefined();
      expect(body.hasGovernmentIdUploaded).toBe(true);
      expect(body.hasProfilePhotoUploaded).toBe(true);
      expect(JSON.stringify(body)).not.toContain('s3.cloud');
    });

    it('8. profile/:userId returns Public DTO only', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/hosts/profile/approved-user-id')
        .set('Authorization', 'Bearer creator-token');
      expect(res.status).toBe(200);
      expect(res.body.verificationBadge).toBe(true);
      expect(res.body.idNumber).toBeUndefined();
    });

    it('9. HTTP 404 when requesting public profile of a non-approved Host', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/hosts/profile/pending-user-id')
        .set('Authorization', 'Bearer creator-token');
      expect(res.status).toBe(404);
    });

    it('10. Public Host search returns approved Hosts only', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/hosts/search')
        .set('Authorization', 'Bearer creator-token');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(mockHostsService.searchHosts).toHaveBeenCalled();
    });
  });
});
