import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { EventsGateway } from '../../common/events/events.gateway';
import { StorageService } from '../storage/storage.service';
import {
  PrivateAssetValidationStatus,
  PrivateAssetVisibility,
} from '../storage/enums/private-asset.enum';
import { PrivateDocumentCategory } from '../storage/enums/private-document-category.enum';
import { HostVerificationAsset } from './entities/host-verification-asset.entity';
import {
  HostProfile,
  HostVerificationStatus,
} from './entities/host-profile.entity';
import { HostVerificationAssetService } from './host-verification-asset.service';
import { HostsService } from './hosts.service';
import { MapperUtils } from './dto/host-response.dto';

const GOVERNMENT_ID_ASSET_ID = '11111111-1111-4111-8111-111111111111';
const SELFIE_ASSET_ID = '22222222-2222-4222-8222-222222222222';
const SUPPORTING_ASSET_ID = '33333333-3333-4333-8333-333333333333';

function assetFixture(
  id: string,
  category: PrivateDocumentCategory,
  overrides: Partial<HostVerificationAsset> = {},
): HostVerificationAsset {
  return Object.assign(new HostVerificationAsset(), {
    id,
    ownerUserId: 'owner-user-id',
    hostProfileId: null,
    category,
    originalFilename: 'document.pdf',
    storageKey: `host-verification/opaque/${category}/${id}.pdf`,
    verifiedMimeType: 'application/pdf',
    verifiedFormat: 'PDF',
    fileSize: 100,
    storageProvider: 'local',
    visibility: PrivateAssetVisibility.PRIVATE,
    validationStatus: PrivateAssetValidationStatus.VALIDATED,
    isActive: true,
    retiredAt: null,
    replacedByAssetId: null,
    createdAt: new Date('2026-08-03T00:00:00.000Z'),
    updatedAt: new Date('2026-08-03T00:00:00.000Z'),
    ...overrides,
  });
}

describe('Private Host Asset Application Linking (B2A-2B)', () => {
  describe('Asset ownership and state validation', () => {
    let service: HostVerificationAssetService;
    let assetRepository: {
      find: jest.Mock;
      save: jest.Mock;
      create: jest.Mock;
    };

    beforeEach(() => {
      assetRepository = {
        find: jest.fn(),
        save: jest.fn(async (assets) => assets),
        create: jest.fn((asset) => asset),
      };
      service = new HostVerificationAssetService(
        assetRepository as unknown as Repository<HostVerificationAsset>,
        {} as StorageService,
        { get: jest.fn() } as unknown as ConfigService,
      );
    });

    it('validates an owned Government ID, selfie and supporting document', async () => {
      const assets = [
        assetFixture(
          GOVERNMENT_ID_ASSET_ID,
          PrivateDocumentCategory.GOVERNMENT_ID,
        ),
        assetFixture(SELFIE_ASSET_ID, PrivateDocumentCategory.SELFIE, {
          verifiedMimeType: 'image/jpeg',
          verifiedFormat: 'JPEG',
        }),
        assetFixture(
          SUPPORTING_ASSET_ID,
          PrivateDocumentCategory.SUPPORTING_DOCUMENT,
        ),
      ];
      assetRepository.find.mockResolvedValue(assets);

      const result = await service.validateApplicationAssets('owner-user-id', {
        governmentIdAssetId: GOVERNMENT_ID_ASSET_ID,
        selfieAssetId: SELFIE_ASSET_ID,
        supportingDocumentAssetIds: [SUPPORTING_ASSET_ID],
      });

      expect(result).toEqual(assets);
    });

    it('rejects a missing asset ID', async () => {
      assetRepository.find.mockResolvedValue([]);

      await expect(
        service.validateApplicationAssets('owner-user-id', {
          governmentIdAssetId: GOVERNMENT_ID_ASSET_ID,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('blocks a cross-user asset', async () => {
      assetRepository.find.mockResolvedValue([
        assetFixture(
          GOVERNMENT_ID_ASSET_ID,
          PrivateDocumentCategory.GOVERNMENT_ID,
          { ownerUserId: 'different-user-id' },
        ),
      ]);

      await expect(
        service.validateApplicationAssets('owner-user-id', {
          governmentIdAssetId: GOVERNMENT_ID_ASSET_ID,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects an asset submitted under the wrong category', async () => {
      assetRepository.find.mockResolvedValue([
        assetFixture(
          GOVERNMENT_ID_ASSET_ID,
          PrivateDocumentCategory.SUPPORTING_DOCUMENT,
        ),
      ]);

      await expect(
        service.validateApplicationAssets('owner-user-id', {
          governmentIdAssetId: GOVERNMENT_ID_ASSET_ID,
        }),
      ).rejects.toThrow('is not valid for GOVERNMENT_ID');
    });

    it.each([
      ['inactive', { isActive: false }],
      ['retired', { retiredAt: new Date() }],
      ['replaced', { replacedByAssetId: SELFIE_ASSET_ID }],
    ])('rejects an %s asset', async (_state, overrides) => {
      assetRepository.find.mockResolvedValue([
        assetFixture(
          GOVERNMENT_ID_ASSET_ID,
          PrivateDocumentCategory.GOVERNMENT_ID,
          overrides,
        ),
      ]);

      await expect(
        service.validateApplicationAssets('owner-user-id', {
          governmentIdAssetId: GOVERNMENT_ID_ASSET_ID,
        }),
      ).rejects.toThrow('Inactive, retired, or replaced');
    });

    it('rejects an asset that has not passed validation', async () => {
      assetRepository.find.mockResolvedValue([
        assetFixture(
          GOVERNMENT_ID_ASSET_ID,
          PrivateDocumentCategory.GOVERNMENT_ID,
          { validationStatus: PrivateAssetValidationStatus.PENDING },
        ),
      ]);

      await expect(
        service.validateApplicationAssets('owner-user-id', {
          governmentIdAssetId: GOVERNMENT_ID_ASSET_ID,
        }),
      ).rejects.toThrow('Only validated');
    });

    it('rejects an asset already linked to another Host application', async () => {
      assetRepository.find.mockResolvedValue([
        assetFixture(
          GOVERNMENT_ID_ASSET_ID,
          PrivateDocumentCategory.GOVERNMENT_ID,
          { hostProfileId: 'other-host-profile-id' },
        ),
      ]);

      await expect(
        service.validateApplicationAssets(
          'owner-user-id',
          { governmentIdAssetId: GOVERNMENT_ID_ASSET_ID },
          'target-host-profile-id',
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects duplicate IDs across application categories', async () => {
      await expect(
        service.validateApplicationAssets('owner-user-id', {
          governmentIdAssetId: GOVERNMENT_ID_ASSET_ID,
          supportingDocumentAssetIds: [GOVERNMENT_ID_ASSET_ID],
        }),
      ).rejects.toThrow('Duplicate Host verification asset IDs');
      expect(assetRepository.find).not.toHaveBeenCalled();
    });

    it('links all selected assets to the Host profile', async () => {
      const selected = [
        assetFixture(
          GOVERNMENT_ID_ASSET_ID,
          PrivateDocumentCategory.GOVERNMENT_ID,
        ),
        assetFixture(SELFIE_ASSET_ID, PrivateDocumentCategory.SELFIE),
        assetFixture(
          SUPPORTING_ASSET_ID,
          PrivateDocumentCategory.SUPPORTING_DOCUMENT,
        ),
      ];
      assetRepository.find
        .mockResolvedValueOnce(selected)
        .mockResolvedValueOnce([]);

      const linked = await service.linkApplicationAssets(
        'owner-user-id',
        'host-profile-id',
        {
          governmentIdAssetId: GOVERNMENT_ID_ASSET_ID,
          selfieAssetId: SELFIE_ASSET_ID,
          supportingDocumentAssetIds: [SUPPORTING_ASSET_ID],
        },
      );

      expect(linked).toHaveLength(3);
      expect(
        linked.every((asset) => asset.hostProfileId === 'host-profile-id'),
      ).toBe(true);
      expect(assetRepository.save).toHaveBeenCalledWith(selected);
    });

    it('permits multiple active supporting-document assets', async () => {
      const secondSupportingId = '44444444-4444-4444-8444-444444444444';
      const selected = [
        assetFixture(
          SUPPORTING_ASSET_ID,
          PrivateDocumentCategory.SUPPORTING_DOCUMENT,
        ),
        assetFixture(
          secondSupportingId,
          PrivateDocumentCategory.SUPPORTING_DOCUMENT,
        ),
      ];
      assetRepository.find
        .mockResolvedValueOnce(selected)
        .mockResolvedValueOnce([]);

      const linked = await service.linkApplicationAssets(
        'owner-user-id',
        'host-profile-id',
        {
          supportingDocumentAssetIds: [SUPPORTING_ASSET_ID, secondSupportingId],
        },
      );

      expect(linked).toHaveLength(2);
      expect(linked.every((asset) => asset.isActive)).toBe(true);
    });

    it('blocks Government ID replacement outside the replacement workflow', async () => {
      const selected = assetFixture(
        GOVERNMENT_ID_ASSET_ID,
        PrivateDocumentCategory.GOVERNMENT_ID,
      );
      const existing = assetFixture(
        '55555555-5555-4555-8555-555555555555',
        PrivateDocumentCategory.GOVERNMENT_ID,
        { hostProfileId: 'host-profile-id' },
      );
      assetRepository.find
        .mockResolvedValueOnce([selected])
        .mockResolvedValueOnce([existing]);

      await expect(
        service.linkApplicationAssets('owner-user-id', 'host-profile-id', {
          governmentIdAssetId: GOVERNMENT_ID_ASSET_ID,
        }),
      ).rejects.toThrow('controlled replacement workflow');
      expect(assetRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('Host application contract integration', () => {
    let service: HostsService;
    let hostRepository: {
      findOne: jest.Mock;
      create: jest.Mock;
      save: jest.Mock;
      remove: jest.Mock;
    };
    let assetService: {
      validateApplicationAssets: jest.Mock;
      linkApplicationAssets: jest.Mock;
      getActiveLinkedAssets: jest.Mock;
    };
    let linkedAssets: HostVerificationAsset[];

    beforeEach(() => {
      linkedAssets = [
        assetFixture(
          GOVERNMENT_ID_ASSET_ID,
          PrivateDocumentCategory.GOVERNMENT_ID,
          { hostProfileId: 'host-profile-id' },
        ),
        assetFixture(SELFIE_ASSET_ID, PrivateDocumentCategory.SELFIE, {
          hostProfileId: 'host-profile-id',
        }),
      ];
      hostRepository = {
        findOne: jest.fn().mockResolvedValue(null),
        create: jest.fn((value) => ({ ...value })),
        save: jest.fn(async (value) => ({
          ...value,
          id: value.id || 'host-profile-id',
          createdAt: value.createdAt || new Date('2026-08-03T00:00:00.000Z'),
          updatedAt: new Date('2026-08-03T00:00:00.000Z'),
        })),
        remove: jest.fn().mockResolvedValue(undefined),
      };
      const basicRepository = {
        findOne: jest.fn().mockResolvedValue(null),
        create: jest.fn((value) => value),
        save: jest.fn(async (value) => value),
        find: jest.fn().mockResolvedValue([]),
      };
      assetService = {
        validateApplicationAssets: jest.fn().mockResolvedValue(linkedAssets),
        linkApplicationAssets: jest.fn().mockResolvedValue(linkedAssets),
        getActiveLinkedAssets: jest.fn().mockResolvedValue(linkedAssets),
      };

      service = new HostsService(
        hostRepository as unknown as Repository<HostProfile>,
        basicRepository as never,
        basicRepository as never,
        basicRepository as never,
        basicRepository as never,
        basicRepository as never,
        basicRepository as never,
        { broadcastHostEvent: jest.fn() } as unknown as EventsGateway,
        {} as StorageService,
        undefined,
        assetService as unknown as HostVerificationAssetService,
      );
    });

    it('creates a Host application using only JWT-owned private asset IDs', async () => {
      const result = await service.applyForVerification('owner-user-id', {
        realName: 'Private Applicant',
        idNumber: 'PRIVATE-ID-123',
        governmentIdAssetId: GOVERNMENT_ID_ASSET_ID,
        selfieAssetId: SELFIE_ASSET_ID,
        supportingDocumentAssetIds: [SUPPORTING_ASSET_ID],
      });
      const created = hostRepository.create.mock.calls[0][0];

      expect(assetService.validateApplicationAssets).toHaveBeenCalledWith(
        'owner-user-id',
        {
          governmentIdAssetId: GOVERNMENT_ID_ASSET_ID,
          selfieAssetId: SELFIE_ASSET_ID,
          supportingDocumentAssetIds: [SUPPORTING_ASSET_ID],
        },
      );
      expect(assetService.linkApplicationAssets).toHaveBeenCalledWith(
        'owner-user-id',
        'host-profile-id',
        expect.any(Object),
      );
      expect(created.documentUrl).toBe('');
      expect(created.selfieUrl).toBe('');
      expect(created).not.toHaveProperty('governmentIdAssetId');
      expect(created).not.toHaveProperty('selfieAssetId');
      expect(result.verificationAssets).toEqual(linkedAssets);
      expect(result.status).toBe(HostVerificationStatus.PENDING);
    });

    it('rejects a mixed private-asset and legacy-URL application', async () => {
      await expect(
        service.applyForVerification('owner-user-id', {
          realName: 'Mixed Applicant',
          idNumber: 'PRIVATE-ID-123',
          governmentIdAssetId: GOVERNMENT_ID_ASSET_ID,
          selfieAssetId: SELFIE_ASSET_ID,
          documentUrl: 'https://public.example/id.jpg',
        }),
      ).rejects.toThrow('cannot be combined with legacy document URLs');
      expect(hostRepository.findOne).not.toHaveBeenCalled();
    });

    it('requires both Government ID and selfie asset IDs for a new secure application', async () => {
      await expect(
        service.applyForVerification('owner-user-id', {
          realName: 'Incomplete Applicant',
          idNumber: 'PRIVATE-ID-123',
          governmentIdAssetId: GOVERNMENT_ID_ASSET_ID,
        }),
      ).rejects.toThrow('private selfie asset ID is required');
      expect(hostRepository.save).not.toHaveBeenCalled();
    });

    it('removes a newly created Host profile if asset linking fails', async () => {
      assetService.linkApplicationAssets.mockRejectedValueOnce(
        new ConflictException('Asset was linked concurrently'),
      );

      await expect(
        service.applyForVerification('owner-user-id', {
          realName: 'Compensated Applicant',
          idNumber: 'PRIVATE-ID-123',
          governmentIdAssetId: GOVERNMENT_ID_ASSET_ID,
          selfieAssetId: SELFIE_ASSET_ID,
        }),
      ).rejects.toThrow('Asset was linked concurrently');
      expect(hostRepository.remove).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'host-profile-id' }),
      );
    });

    it('reuses valid linked private assets for a rejected application', async () => {
      const rejected = {
        id: 'host-profile-id',
        userId: 'owner-user-id',
        realName: 'Rejected Applicant',
        idNumber: 'ORIGINAL-ID',
        documentUrl: '',
        selfieUrl: '',
        status: HostVerificationStatus.REJECTED,
      } as HostProfile;
      hostRepository.findOne.mockResolvedValueOnce(rejected);

      const result = await service.applyForVerification('owner-user-id', {
        realName: 'Reapplicant',
        idNumber: '',
      });

      expect(assetService.getActiveLinkedAssets).toHaveBeenCalledWith(
        'owner-user-id',
        'host-profile-id',
      );
      expect(assetService.linkApplicationAssets).toHaveBeenCalledWith(
        'owner-user-id',
        'host-profile-id',
        expect.objectContaining({
          governmentIdAssetId: GOVERNMENT_ID_ASSET_ID,
          selfieAssetId: SELFIE_ASSET_ID,
        }),
      );
      expect(result.status).toBe(HostVerificationStatus.PENDING);
      expect(result.verificationAssets).toEqual(linkedAssets);
    });

    it('maps private asset presence to safe owner upload-status flags', async () => {
      const dto = MapperUtils.toOwnerHostDto({
        id: 'host-profile-id',
        userId: 'owner-user-id',
        realName: 'Private Applicant',
        idNumber: 'PRIVATE-ID-123',
        documentUrl: '',
        selfieUrl: '',
        status: HostVerificationStatus.PENDING,
        verificationAssets: [
          ...linkedAssets,
          assetFixture(
            SUPPORTING_ASSET_ID,
            PrivateDocumentCategory.SUPPORTING_DOCUMENT,
            { hostProfileId: 'host-profile-id' },
          ),
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as HostProfile);

      expect(dto.hasGovernmentIdUploaded).toBe(true);
      expect(dto.hasProfilePhotoUploaded).toBe(true);
      expect(dto.hasSupportingDocumentsUploaded).toBe(true);
      expect(dto).not.toHaveProperty('verificationAssets');
      expect(dto).not.toHaveProperty('storageKey');
    });

    it('does not count unvalidated private assets in owner status flags', () => {
      const dto = MapperUtils.toOwnerHostDto({
        id: 'host-profile-id',
        userId: 'owner-user-id',
        realName: 'Private Applicant',
        idNumber: 'PRIVATE-ID-123',
        documentUrl: '',
        selfieUrl: '',
        status: HostVerificationStatus.PENDING,
        verificationAssets: [
          assetFixture(
            GOVERNMENT_ID_ASSET_ID,
            PrivateDocumentCategory.GOVERNMENT_ID,
            { validationStatus: PrivateAssetValidationStatus.PENDING },
          ),
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as HostProfile);

      expect(dto.hasGovernmentIdUploaded).toBe(false);
      expect(dto.hasProfilePhotoUploaded).toBe(false);
      expect(dto.hasSupportingDocumentsUploaded).toBe(false);
    });
  });
});
