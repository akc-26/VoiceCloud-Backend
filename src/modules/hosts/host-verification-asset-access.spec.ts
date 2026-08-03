import {
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
  StreamableFile,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { Response } from 'express';
import { UserRole } from '../../common/enums';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { StorageService } from '../storage/storage.service';
import {
  PrivateAssetValidationStatus,
  PrivateAssetVisibility,
} from '../storage/enums/private-asset.enum';
import { PrivateDocumentCategory } from '../storage/enums/private-document-category.enum';
import { HostVerificationAsset } from './entities/host-verification-asset.entity';
import { HostVerificationAssetService } from './host-verification-asset.service';
import { HostsController } from './hosts.controller';
import { HostsService } from './hosts.service';

const OWNER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OTHER_USER_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const HOST_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const CURRENT_ID = '11111111-1111-4111-8111-111111111111';
const REPLACEMENT_ID = '22222222-2222-4222-8222-222222222222';

function assetFixture(
  id: string,
  category = PrivateDocumentCategory.GOVERNMENT_ID,
  overrides: Partial<HostVerificationAsset> = {},
): HostVerificationAsset {
  return Object.assign(new HostVerificationAsset(), {
    id,
    ownerUserId: OWNER_ID,
    hostProfileId: HOST_ID,
    category,
    originalFilename: 'verification document.pdf',
    storageKey: `host-verification/opaque/${category}/${id}.pdf`,
    verifiedMimeType: 'application/pdf',
    verifiedFormat: 'PDF',
    fileSize: 4,
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

describe('Private Host verification access and replacement (B2A-2C)', () => {
  describe('Secure metadata and content access', () => {
    let service: HostVerificationAssetService;
    let repository: {
      find: jest.Mock;
      findOne: jest.Mock;
      manager: { transaction: jest.Mock };
    };
    let storage: {
      existsPrivateObject: jest.Mock;
      readPrivateObject: jest.Mock;
    };

    beforeEach(() => {
      repository = {
        find: jest.fn(),
        findOne: jest.fn(),
        manager: { transaction: jest.fn() },
      };
      storage = {
        existsPrivateObject: jest.fn().mockResolvedValue(true),
        readPrivateObject: jest.fn().mockResolvedValue(Buffer.from('data')),
      };
      service = new HostVerificationAssetService(
        repository as unknown as Repository<HostVerificationAsset>,
        storage as unknown as StorageService,
        { get: jest.fn() } as unknown as ConfigService,
      );
    });

    it('allows an owner to read their current private asset', async () => {
      const asset = assetFixture(CURRENT_ID);
      repository.findOne.mockResolvedValue(asset);

      const result = await service.getAuthorizedContent(CURRENT_ID, {
        userId: OWNER_ID,
        role: UserRole.CREATOR,
        roles: [UserRole.CREATOR],
      });

      expect(result.asset).toBe(asset);
      expect(result.buffer.equals(Buffer.from('data'))).toBe(true);
      expect(storage.existsPrivateObject).toHaveBeenCalledWith(
        asset.storageKey,
      );
      expect(storage.readPrivateObject).toHaveBeenCalledWith(asset.storageKey);
    });

    it.each([UserRole.ADMIN, UserRole.SUPER_ADMIN])(
      'allows %s to read an asset linked to a Host application',
      async (role) => {
        repository.findOne.mockResolvedValue(assetFixture(CURRENT_ID));

        await expect(
          service.getAuthorizedContent(CURRENT_ID, {
            userId: OTHER_USER_ID,
            role,
            roles: [role],
          }),
        ).resolves.toMatchObject({ buffer: Buffer.from('data') });
      },
    );

    it('blocks a different non-administrator user', async () => {
      repository.findOne.mockResolvedValue(assetFixture(CURRENT_ID));

      await expect(
        service.getAuthorizedContent(CURRENT_ID, {
          userId: OTHER_USER_ID,
          role: UserRole.CREATOR,
        }),
      ).rejects.toThrow(ForbiddenException);
      expect(storage.readPrivateObject).not.toHaveBeenCalled();
    });

    it('blocks administrator access to an unlinked upload', async () => {
      repository.findOne.mockResolvedValue(
        assetFixture(CURRENT_ID, PrivateDocumentCategory.GOVERNMENT_ID, {
          hostProfileId: null,
        }),
      );

      await expect(
        service.getAuthorizedContent(CURRENT_ID, {
          userId: OTHER_USER_ID,
          role: UserRole.ADMIN,
        }),
      ).rejects.toThrow('only access assets linked');
    });

    it.each([
      ['inactive', { isActive: false }],
      ['retired', { retiredAt: new Date() }],
      ['replaced', { replacedByAssetId: REPLACEMENT_ID }],
      [
        'unvalidated',
        { validationStatus: PrivateAssetValidationStatus.PENDING },
      ],
    ])('prevents access to an %s asset', async (_state, overrides) => {
      repository.findOne.mockResolvedValue(
        assetFixture(
          CURRENT_ID,
          PrivateDocumentCategory.GOVERNMENT_ID,
          overrides,
        ),
      );

      await expect(
        service.getAuthorizedContent(CURRENT_ID, { userId: OWNER_ID }),
      ).rejects.toThrow(NotFoundException);
      expect(storage.existsPrivateObject).not.toHaveBeenCalled();
    });

    it('returns not found when private content no longer exists', async () => {
      repository.findOne.mockResolvedValue(assetFixture(CURRENT_ID));
      storage.existsPrivateObject.mockResolvedValue(false);

      await expect(
        service.getAuthorizedContent(CURRENT_ID, { userId: OWNER_ID }),
      ).rejects.toThrow(NotFoundException);
    });

    it('fails securely without exposing provider errors', async () => {
      repository.findOne.mockResolvedValue(assetFixture(CURRENT_ID));
      storage.readPrivateObject.mockRejectedValue(
        new Error('private path /secret/root/file.pdf'),
      );

      await expect(
        service.getAuthorizedContent(CURRENT_ID, { userId: OWNER_ID }),
      ).rejects.toThrow(ServiceUnavailableException);
    });

    it('returns safe owner metadata for multiple supporting documents', async () => {
      repository.find.mockResolvedValue([
        assetFixture(CURRENT_ID, PrivateDocumentCategory.SUPPORTING_DOCUMENT),
        assetFixture(
          REPLACEMENT_ID,
          PrivateDocumentCategory.SUPPORTING_DOCUMENT,
        ),
      ]);

      const result = await service.listOwnerAssets(OWNER_ID);

      expect(result).toHaveLength(2);
      expect(result[0]).not.toHaveProperty('storageKey');
      expect(result[0]).not.toHaveProperty('storageProvider');
      expect(result[0]).not.toHaveProperty('ownerUserId');
      expect(result[0]).not.toHaveProperty('url');
    });

    it('returns only safe linked metadata for an administrator', async () => {
      repository.find.mockResolvedValue([assetFixture(CURRENT_ID)]);

      const result = await service.listHostAssetsForAdmin(HOST_ID);

      expect(result).toEqual([
        expect.objectContaining({
          assetId: CURRENT_ID,
          category: PrivateDocumentCategory.GOVERNMENT_ID,
        }),
      ]);
      expect(result[0]).not.toHaveProperty('storageKey');
      expect(result[0]).not.toHaveProperty('ownerUserId');
    });
  });

  describe('Transaction-safe replacement', () => {
    let service: HostVerificationAssetService;
    let transactionRepository: {
      findOne: jest.Mock;
      save: jest.Mock;
    };
    let transaction: jest.Mock;

    beforeEach(() => {
      transactionRepository = {
        findOne: jest.fn(),
        save: jest.fn(async (assets) => assets),
      };
      transaction = jest.fn(async (work) =>
        work({ getRepository: () => transactionRepository }),
      );
      service = new HostVerificationAssetService(
        {
          manager: { transaction },
        } as unknown as Repository<HostVerificationAsset>,
        {} as StorageService,
        { get: jest.fn() } as unknown as ConfigService,
      );
    });

    it('retires the current asset and links its replacement atomically', async () => {
      const current = assetFixture(CURRENT_ID);
      const replacement = assetFixture(REPLACEMENT_ID, current.category, {
        hostProfileId: null,
      });
      transactionRepository.findOne
        .mockResolvedValueOnce(current)
        .mockResolvedValueOnce(replacement)
        .mockResolvedValueOnce(null);

      const result = await service.replaceLinkedAsset(
        OWNER_ID,
        CURRENT_ID,
        REPLACEMENT_ID,
      );

      expect(transaction).toHaveBeenCalledTimes(1);
      expect(current.isActive).toBe(false);
      expect(current.retiredAt).toBeInstanceOf(Date);
      expect(current.replacedByAssetId).toBe(REPLACEMENT_ID);
      expect(replacement.hostProfileId).toBe(HOST_ID);
      expect(transactionRepository.save).toHaveBeenCalledWith([
        replacement,
        current,
      ]);
      expect(result).toMatchObject({ assetId: REPLACEMENT_ID, isActive: true });
      expect(result).not.toHaveProperty('storageKey');
    });

    it('replaces one supporting document without querying or retiring others', async () => {
      const current = assetFixture(
        CURRENT_ID,
        PrivateDocumentCategory.SUPPORTING_DOCUMENT,
      );
      const replacement = assetFixture(REPLACEMENT_ID, current.category, {
        hostProfileId: null,
      });
      transactionRepository.findOne
        .mockResolvedValueOnce(current)
        .mockResolvedValueOnce(replacement);

      await service.replaceLinkedAsset(OWNER_ID, CURRENT_ID, REPLACEMENT_ID);

      expect(transactionRepository.findOne).toHaveBeenCalledTimes(2);
      expect(replacement.hostProfileId).toBe(HOST_ID);
      expect(current.replacedByAssetId).toBe(REPLACEMENT_ID);
    });

    it('blocks cross-user replacement of the current asset', async () => {
      transactionRepository.findOne.mockResolvedValueOnce(
        assetFixture(CURRENT_ID),
      );

      await expect(
        service.replaceLinkedAsset(OTHER_USER_ID, CURRENT_ID, REPLACEMENT_ID),
      ).rejects.toThrow(ForbiddenException);
      expect(transactionRepository.save).not.toHaveBeenCalled();
    });

    it('requires the replacement category to match', async () => {
      transactionRepository.findOne
        .mockResolvedValueOnce(assetFixture(CURRENT_ID))
        .mockResolvedValueOnce(
          assetFixture(REPLACEMENT_ID, PrivateDocumentCategory.SELFIE, {
            hostProfileId: null,
          }),
        );

      await expect(
        service.replaceLinkedAsset(OWNER_ID, CURRENT_ID, REPLACEMENT_ID),
      ).rejects.toThrow('category must match');
    });

    it('blocks a replacement asset owned by another user', async () => {
      transactionRepository.findOne
        .mockResolvedValueOnce(assetFixture(CURRENT_ID))
        .mockResolvedValueOnce(
          assetFixture(REPLACEMENT_ID, undefined, {
            ownerUserId: OTHER_USER_ID,
            hostProfileId: null,
          }),
        );

      await expect(
        service.replaceLinkedAsset(OWNER_ID, CURRENT_ID, REPLACEMENT_ID),
      ).rejects.toThrow(ForbiddenException);
    });

    it('blocks a replacement asset already linked to an application', async () => {
      transactionRepository.findOne
        .mockResolvedValueOnce(assetFixture(CURRENT_ID))
        .mockResolvedValueOnce(assetFixture(REPLACEMENT_ID));

      await expect(
        service.replaceLinkedAsset(OWNER_ID, CURRENT_ID, REPLACEMENT_ID),
      ).rejects.toThrow('must not already be linked');
    });

    it('blocks replacement of a retired current asset', async () => {
      transactionRepository.findOne.mockResolvedValueOnce(
        assetFixture(CURRENT_ID, undefined, { retiredAt: new Date() }),
      );

      await expect(
        service.replaceLinkedAsset(OWNER_ID, CURRENT_ID, REPLACEMENT_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('blocks replacement when another current Government ID exists', async () => {
      const current = assetFixture(CURRENT_ID);
      const replacement = assetFixture(REPLACEMENT_ID, current.category, {
        hostProfileId: null,
      });
      transactionRepository.findOne
        .mockResolvedValueOnce(current)
        .mockResolvedValueOnce(replacement)
        .mockResolvedValueOnce(
          assetFixture('33333333-3333-4333-8333-333333333333'),
        );

      await expect(
        service.replaceLinkedAsset(OWNER_ID, CURRENT_ID, REPLACEMENT_ID),
      ).rejects.toThrow('Another active GOVERNMENT_ID');
    });
  });

  describe('Controller security headers and role metadata', () => {
    it('streams content with private no-cache and browser-hardening headers', async () => {
      const asset = assetFixture(CURRENT_ID, undefined, {
        originalFilename: 'review\r\nfile.pdf',
      });
      const hostsService = {
        getVerificationAssetContent: jest.fn().mockResolvedValue({
          asset,
          buffer: Buffer.from('data'),
        }),
      };
      const controller = new HostsController(
        hostsService as unknown as HostsService,
      );
      const response = { setHeader: jest.fn() } as unknown as Response;

      const result = await controller.getVerificationAssetContent(
        CURRENT_ID,
        {
          userId: OWNER_ID,
          role: UserRole.CREATOR,
          roles: [UserRole.CREATOR],
        } as never,
        response,
      );

      expect(result).toBeInstanceOf(StreamableFile);
      expect(response.setHeader).toHaveBeenCalledWith(
        'Cache-Control',
        'private, no-store, max-age=0',
      );
      expect(response.setHeader).toHaveBeenCalledWith(
        'X-Content-Type-Options',
        'nosniff',
      );
      expect(response.setHeader).toHaveBeenCalledWith(
        'Cross-Origin-Resource-Policy',
        'same-origin',
      );
      expect(response.setHeader).toHaveBeenCalledWith(
        'Content-Security-Policy',
        "default-src 'none'; sandbox",
      );
      const disposition = (response.setHeader as jest.Mock).mock.calls.find(
        ([name]) => name === 'Content-Disposition',
      )?.[1];
      expect(disposition).not.toContain('\r');
      expect(disposition).not.toContain('\n');
    });

    it('keeps the admin asset-list route restricted to Admin and Super Admin', () => {
      const roles = Reflect.getMetadata(
        ROLES_KEY,
        HostsController.prototype.listHostVerificationAssetsForAdmin,
      );

      expect(roles).toEqual([UserRole.ADMIN, UserRole.SUPER_ADMIN]);
      expect(
        Reflect.getMetadata(
          ROLES_KEY,
          HostsController.prototype.getVerificationAssetContent,
        ),
      ).toBeUndefined();
    });
  });
});
