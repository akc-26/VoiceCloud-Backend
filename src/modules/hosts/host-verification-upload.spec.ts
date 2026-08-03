import { INestApplication, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Readable } from 'stream';
import * as request from 'supertest';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
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
import {
  HOST_VERIFICATION_UPLOAD_CATEGORY,
  HostVerificationUploadInterceptor,
} from './interceptors/host-verification-upload.interceptor';
import {
  sanitizePrivateDocumentFilename,
  validateHostVerificationFile,
} from './utils/host-verification-file.util';

function fileFixture(
  buffer: Buffer,
  originalname: string,
  mimetype: string,
): Express.Multer.File {
  return {
    fieldname: 'file',
    originalname,
    encoding: '7bit',
    mimetype,
    size: buffer.length,
    buffer,
    stream: Readable.from(buffer),
    destination: '',
    filename: '',
    path: '',
  };
}

const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]);
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const pdf = Buffer.from('%PDF-1.7\nprivate document');
const webp = Buffer.from('RIFF\x04\x00\x00\x00WEBP', 'binary');

describe('Secure Host Verification Upload Foundation (B2A-2A)', () => {
  describe('Strict file validation', () => {
    it('accepts government ID JPEG, PNG, and PDF signatures', () => {
      expect(
        validateHostVerificationFile(
          fileFixture(jpeg, 'id.jpg', 'image/jpeg'),
          PrivateDocumentCategory.GOVERNMENT_ID,
          1024,
        ).verifiedFormat,
      ).toBe('JPEG');
      expect(
        validateHostVerificationFile(
          fileFixture(png, 'id.png', 'image/png'),
          PrivateDocumentCategory.GOVERNMENT_ID,
          1024,
        ).verifiedFormat,
      ).toBe('PNG');
      expect(
        validateHostVerificationFile(
          fileFixture(pdf, 'id.pdf', 'application/pdf'),
          PrivateDocumentCategory.GOVERNMENT_ID,
          1024,
        ).verifiedFormat,
      ).toBe('PDF');
    });

    it('accepts a verified WEBP selfie', () => {
      expect(
        validateHostVerificationFile(
          fileFixture(webp, 'selfie.webp', 'image/webp'),
          PrivateDocumentCategory.SELFIE,
          1024,
        ).verifiedFormat,
      ).toBe('WEBP');
    });

    it('rejects extension and magic-byte disagreement', () => {
      expect(() =>
        validateHostVerificationFile(
          fileFixture(pdf, 'identity.jpg', 'application/pdf'),
          PrivateDocumentCategory.GOVERNMENT_ID,
          1024,
        ),
      ).toThrow('Filename extension does not match');
    });

    it('rejects declared MIME and magic-byte disagreement', () => {
      expect(() =>
        validateHostVerificationFile(
          fileFixture(png, 'identity.png', 'image/jpeg'),
          PrivateDocumentCategory.GOVERNMENT_ID,
          1024,
        ),
      ).toThrow('Declared MIME type does not match');
    });

    it('rejects unrecognized content even with an allowed extension and MIME', () => {
      expect(() =>
        validateHostVerificationFile(
          fileFixture(Buffer.from('not an image'), 'identity.png', 'image/png'),
          PrivateDocumentCategory.GOVERNMENT_ID,
          1024,
        ),
      ).toThrow('File content is not an allowed');
    });

    it('rejects PDF content for the selfie category', () => {
      expect(() =>
        validateHostVerificationFile(
          fileFixture(pdf, 'selfie.pdf', 'application/pdf'),
          PrivateDocumentCategory.SELFIE,
          1024,
        ),
      ).toThrow('PDF is not allowed for SELFIE');
    });

    it('rejects empty and over-limit content', () => {
      expect(() =>
        validateHostVerificationFile(
          fileFixture(Buffer.alloc(0), 'identity.jpg', 'image/jpeg'),
          PrivateDocumentCategory.GOVERNMENT_ID,
          1024,
        ),
      ).toThrow('cannot be empty');
      expect(() =>
        validateHostVerificationFile(
          fileFixture(jpeg, 'identity.jpg', 'image/jpeg'),
          PrivateDocumentCategory.GOVERNMENT_ID,
          4,
        ),
      ).toThrow('configured GOVERNMENT_ID size limit');
    });

    it('sanitizes a display filename without retaining path components', () => {
      expect(sanitizePrivateDocumentFilename('../unsafe/My ID (1).PDF')).toBe(
        'My ID _1_.pdf',
      );
      expect(sanitizePrivateDocumentFilename('..\\unsafe\\selfie.jpg')).toBe(
        'selfie.jpg',
      );
    });
  });

  describe('Private persistence and safe response', () => {
    let service: HostVerificationAssetService;
    let repository: {
      create: jest.Mock;
      save: jest.Mock;
    };
    let storage: {
      generatePrivateStorageKey: jest.Mock;
      writePrivateObject: jest.Mock;
      deletePrivateObject: jest.Mock;
    };
    let config: { get: jest.Mock };

    beforeEach(() => {
      repository = {
        create: jest.fn((value) => value),
        save: jest.fn(async (value) => ({
          ...value,
          id: `asset-${repository.save.mock.calls.length}`,
          createdAt: new Date('2026-08-03T00:00:00.000Z'),
          updatedAt: new Date('2026-08-03T00:00:00.000Z'),
        })),
      };
      storage = {
        generatePrivateStorageKey: jest.fn(
          (_owner, category, extension) =>
            `host-verification/opaque/${category}/opaque${extension}`,
        ),
        writePrivateObject: jest.fn().mockResolvedValue('local'),
        deletePrivateObject: jest.fn().mockResolvedValue(true),
      };
      config = {
        get: jest.fn((_key, defaultValue) => defaultValue),
      };
      service = new HostVerificationAssetService(
        repository as unknown as Repository<HostVerificationAsset>,
        storage as unknown as StorageService,
        config as unknown as ConfigService,
      );
    });

    it('persists JWT owner metadata, a private opaque key, and validated state', async () => {
      const response = await service.uploadValidatedAsset(
        'jwt-owner-id',
        PrivateDocumentCategory.GOVERNMENT_ID,
        fileFixture(pdf, '../Identity Card.PDF', 'application/pdf'),
      );
      const persisted = repository.create.mock.calls[0][0];

      expect(storage.generatePrivateStorageKey).toHaveBeenCalledWith(
        'jwt-owner-id',
        PrivateDocumentCategory.GOVERNMENT_ID,
        '.pdf',
      );
      expect(persisted).toMatchObject({
        ownerUserId: 'jwt-owner-id',
        hostProfileId: null,
        originalFilename: 'Identity Card.pdf',
        verifiedMimeType: 'application/pdf',
        verifiedFormat: 'PDF',
        storageProvider: 'local',
        visibility: PrivateAssetVisibility.PRIVATE,
        validationStatus: PrivateAssetValidationStatus.VALIDATED,
        isActive: true,
      });
      expect(persisted.storageKey).toContain('host-verification/opaque/');
      expect(response).toMatchObject({
        assetId: 'asset-1',
        category: PrivateDocumentCategory.GOVERNMENT_ID,
        validationStatus: PrivateAssetValidationStatus.VALIDATED,
        linkedToApplication: false,
      });
    });

    it('returns no private key, provider, owner ID, path, or URL', async () => {
      const response = await service.uploadValidatedAsset(
        'jwt-owner-id',
        PrivateDocumentCategory.SELFIE,
        fileFixture(jpeg, 'selfie.jpg', 'image/jpeg'),
      );

      expect(response).not.toHaveProperty('storageKey');
      expect(response).not.toHaveProperty('storageProvider');
      expect(response).not.toHaveProperty('ownerUserId');
      expect(response).not.toHaveProperty('filePath');
      expect(response).not.toHaveProperty('publicUrl');
      expect(response).not.toHaveProperty('url');
    });

    it('uses the configured limit for the selected category', async () => {
      config.get.mockReturnValue(4);

      await expect(
        service.uploadValidatedAsset(
          'jwt-owner-id',
          PrivateDocumentCategory.SELFIE,
          fileFixture(jpeg, 'selfie.jpg', 'image/jpeg'),
        ),
      ).rejects.toThrow('configured SELFIE size limit');
      expect(config.get).toHaveBeenCalledWith(
        'storage.hostSelfieMaxSize',
        5 * 1024 * 1024,
      );
      expect(storage.writePrivateObject).not.toHaveBeenCalled();
    });

    it('allows multiple active supporting-document records', async () => {
      await service.uploadValidatedAsset(
        'jwt-owner-id',
        PrivateDocumentCategory.SUPPORTING_DOCUMENT,
        fileFixture(pdf, 'support-1.pdf', 'application/pdf'),
      );
      await service.uploadValidatedAsset(
        'jwt-owner-id',
        PrivateDocumentCategory.SUPPORTING_DOCUMENT,
        fileFixture(png, 'support-2.png', 'image/png'),
      );

      expect(repository.save).toHaveBeenCalledTimes(2);
      expect(repository.create.mock.calls[0][0].isActive).toBe(true);
      expect(repository.create.mock.calls[1][0].isActive).toBe(true);
      expect(repository.create.mock.calls[0][0].retiredAt).toBeNull();
      expect(repository.create.mock.calls[1][0].retiredAt).toBeNull();
    });

    it('deletes the private object when metadata persistence fails', async () => {
      repository.save.mockRejectedValueOnce(new Error('database unavailable'));

      await expect(
        service.uploadValidatedAsset(
          'jwt-owner-id',
          PrivateDocumentCategory.GOVERNMENT_ID,
          fileFixture(pdf, 'identity.pdf', 'application/pdf'),
        ),
      ).rejects.toThrow('database unavailable');
      expect(storage.deletePrivateObject).toHaveBeenCalledWith(
        'host-verification/opaque/GOVERNMENT_ID/opaque.pdf',
      );
    });

    it('does not persist metadata when private storage fails securely', async () => {
      storage.writePrivateObject.mockRejectedValueOnce(
        new Error('S3 private storage operations are unsupported'),
      );

      await expect(
        service.uploadValidatedAsset(
          'jwt-owner-id',
          PrivateDocumentCategory.GOVERNMENT_ID,
          fileFixture(pdf, 'identity.pdf', 'application/pdf'),
        ),
      ).rejects.toThrow('S3 private storage operations are unsupported');
      expect(repository.save).not.toHaveBeenCalled();
      expect(storage.deletePrivateObject).not.toHaveBeenCalled();
    });
  });

  describe('Authenticated multipart routes', () => {
    let app: INestApplication;
    const hostsService = {
      uploadGovernmentId: jest.fn(),
      uploadProfilePhoto: jest.fn(),
      uploadVerificationDocument: jest.fn(),
    };

    beforeAll(async () => {
      const configService = {
        get: jest.fn((key: string, defaultValue: number) => {
          if (key === 'storage.hostGovernmentIdMaxSize') return 6;
          return defaultValue;
        }),
      };
      const authGuard = {
        canActivate: (context: Parameters<JwtAuthGuard['canActivate']>[0]) => {
          const httpRequest = context.switchToHttp().getRequest();
          if (httpRequest.headers.authorization !== 'Bearer valid-token') {
            throw new UnauthorizedException('Authentication token required');
          }
          httpRequest.user = { userId: 'jwt-owner-id' };
          return true;
        },
      };

      const moduleRef = await Test.createTestingModule({
        controllers: [HostsController],
        providers: [
          { provide: HostsService, useValue: hostsService },
          { provide: ConfigService, useValue: configService },
          Reflector,
          HostVerificationUploadInterceptor,
        ],
      })
        .overrideGuard(JwtAuthGuard)
        .useValue(authGuard)
        .overrideGuard(RolesGuard)
        .useValue({ canActivate: () => true })
        .compile();

      app = moduleRef.createNestApplication();
      app.setGlobalPrefix('api/v1');
      await app.init();
    });

    beforeEach(() => {
      jest.clearAllMocks();
      hostsService.uploadGovernmentId.mockResolvedValue({
        assetId: 'safe-asset-id',
        category: PrivateDocumentCategory.GOVERNMENT_ID,
      });
    });

    afterAll(async () => {
      await app.close();
    });

    it('keeps all three approved route-to-category mappings', () => {
      expect(
        Reflect.getMetadata(
          HOST_VERIFICATION_UPLOAD_CATEGORY,
          HostsController.prototype.uploadGovernmentId,
        ),
      ).toBe(PrivateDocumentCategory.GOVERNMENT_ID);
      expect(
        Reflect.getMetadata(
          HOST_VERIFICATION_UPLOAD_CATEGORY,
          HostsController.prototype.uploadProfilePhoto,
        ),
      ).toBe(PrivateDocumentCategory.SELFIE);
      expect(
        Reflect.getMetadata(
          HOST_VERIFICATION_UPLOAD_CATEGORY,
          HostsController.prototype.uploadVerificationDocument,
        ),
      ).toBe(PrivateDocumentCategory.SUPPORTING_DOCUMENT);
    });

    it('rejects an unauthenticated verification upload', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/hosts/verification/government-id')
        .attach('file', jpeg, {
          filename: 'identity.jpg',
          contentType: 'image/jpeg',
        });

      expect(response.status).toBe(401);
      expect(hostsService.uploadGovernmentId).not.toHaveBeenCalled();
    });

    it('takes ownership from the authenticated JWT and returns no public URL', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/hosts/verification/government-id')
        .set('Authorization', 'Bearer valid-token')
        .attach('file', jpeg, {
          filename: 'identity.jpg',
          contentType: 'image/jpeg',
        });

      expect(response.status).toBe(201);
      expect(hostsService.uploadGovernmentId).toHaveBeenCalledWith(
        'jwt-owner-id',
        expect.objectContaining({ originalname: 'identity.jpg' }),
      );
      expect(response.body).toEqual({
        assetId: 'safe-asset-id',
        category: PrivateDocumentCategory.GOVERNMENT_ID,
      });
      expect(response.body).not.toHaveProperty('publicUrl');
    });

    it('rejects over-limit content in Multer before the controller runs', async () => {
      const oversizedJpeg = Buffer.concat([jpeg, Buffer.alloc(2)]);
      const response = await request(app.getHttpServer())
        .post('/api/v1/hosts/verification/government-id')
        .set('Authorization', 'Bearer valid-token')
        .attach('file', oversizedJpeg, {
          filename: 'identity.jpg',
          contentType: 'image/jpeg',
        });

      expect(response.status).toBe(413);
      expect(hostsService.uploadGovernmentId).not.toHaveBeenCalled();
    });

    it('rejects owner identity fields instead of trusting request data', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/hosts/verification/government-id')
        .set('Authorization', 'Bearer valid-token')
        .field('ownerUserId', 'attacker-selected-owner')
        .attach('file', jpeg, {
          filename: 'identity.jpg',
          contentType: 'image/jpeg',
        });

      expect(response.status).toBe(400);
      expect(hostsService.uploadGovernmentId).not.toHaveBeenCalled();
    });
  });
});
