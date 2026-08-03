import 'reflect-metadata';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { ConfigService } from '@nestjs/config';
import { DataType, newDb } from 'pg-mem';
import { getMetadataArgsStorage, QueryRunner } from 'typeorm';
import { AppDataSource } from '../../database/data-source';
import { Phase08HostVerificationLegacyMigrationTracking1700000000007 } from '../../database/migrations/1700000000007-Phase08HostVerificationLegacyMigrationTracking';
import { LocalStorageDriver } from '../storage/drivers/local-storage.driver';
import { PrivateDocumentCategory } from '../storage/enums/private-document-category.enum';
import { StorageService } from '../storage/storage.service';
import {
  HostVerificationLegacyMigration,
  LegacyHostAssetMigrationStatus,
} from './entities/host-verification-legacy-migration.entity';
import {
  HostProfile,
  HostVerificationStatus,
} from './entities/host-profile.entity';
import { HostVerificationAsset } from './entities/host-verification-asset.entity';
import { LegacyHostVerificationMigrationService } from './legacy-host-verification-migration.service';

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);

describe('B2A-3 controlled legacy Host verification migration', () => {
  describe('confined local legacy source handling', () => {
    let tempRoot: string;
    let publicRoot: string;
    let privateRoot: string;
    let driver: LocalStorageDriver;

    beforeEach(() => {
      tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'voicecloud-legacy-'));
      publicRoot = path.join(tempRoot, 'uploads');
      privateRoot = path.join(tempRoot, 'private');
      driver = new LocalStorageDriver(privateRoot, publicRoot);
      fs.mkdirSync(path.join(publicRoot, 'host_id'), { recursive: true });
      fs.writeFileSync(path.join(publicRoot, 'host_id', 'identity.jpg'), JPEG);
    });

    afterEach(() => {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    });

    it('reads only a confined /uploads legacy object', async () => {
      const object = await driver.readLegacyPublic(
        '/uploads/host_id/identity.jpg',
      );

      expect(object.buffer).toEqual(JPEG);
      expect(object.originalFilename).toBe('identity.jpg');
      expect(object.mimeType).toBe('image/jpeg');
    });

    it('accepts an HTTP legacy URL only as a local uploads path', async () => {
      const object = await driver.readLegacyPublic(
        'https://legacy.example/uploads/host_id/identity.jpg?download=1',
      );
      expect(object.buffer).toEqual(JPEG);
    });

    it.each([
      '../uploads/host_id/identity.jpg',
      '/uploads/%2e%2e/secret.jpg',
      '/uploads/host_id/../identity.jpg',
      'file:///uploads/host_id/identity.jpg',
      '/private/identity.jpg',
      '/uploads\\host_id\\identity.jpg',
    ])('rejects unsafe legacy reference %s', async (reference) => {
      await expect(driver.readLegacyPublic(reference)).rejects.toThrow();
    });

    it('quarantines the public object under the private root', async () => {
      const quarantineKey =
        'legacy-host-verification-quarantine/GOVERNMENT_ID/opaque.jpg';
      await driver.quarantineLegacyPublic(
        '/uploads/host_id/identity.jpg',
        quarantineKey,
      );

      await expect(
        driver.readLegacyPublic('/uploads/host_id/identity.jpg'),
      ).rejects.toThrow('not found');
      expect(await driver.readPrivate(quarantineKey)).toEqual(JPEG);
      expect(
        fs.existsSync(path.join(publicRoot, 'host_id', 'identity.jpg')),
      ).toBe(false);
    });

    it('rejects a symbolic-link escape in a legacy public path', async () => {
      const outside = path.join(tempRoot, 'outside.jpg');
      const link = path.join(publicRoot, 'host_id', 'link.jpg');
      fs.writeFileSync(outside, JPEG);
      fs.symlinkSync(outside, link);

      await expect(
        driver.readLegacyPublic('/uploads/host_id/link.jpg'),
      ).rejects.toThrow('Symbolic link');
    });
  });

  describe('controlled service execution', () => {
    const host = (): HostProfile =>
      ({
        id: '22222222-2222-4222-8222-222222222222',
        userId: '11111111-1111-4111-8111-111111111111',
        realName: 'Legacy Host',
        idNumber: 'ID123456',
        documentUrl: '/uploads/host_id/identity.jpg',
        selfieUrl: '',
        status: HostVerificationStatus.PENDING,
      }) as HostProfile;

    function harness(options?: { readError?: Error; invalid?: boolean }) {
      const currentHost = host();
      const migrationRecords: HostVerificationLegacyMigration[] = [];
      const transactionalHost = { ...currentHost };
      const migrationRepository = {
        find: jest.fn(async () => migrationRecords),
        findOne: jest.fn(async () => null),
        create: jest.fn(() => ({})),
        save: jest.fn(async (record) => {
          migrationRecords.push(record as HostVerificationLegacyMigration);
          return record;
        }),
      };
      const hostTransactionRepository = {
        findOne: jest.fn(async () => transactionalHost),
        save: jest.fn(async (record) => record),
      };
      const assetTransactionRepository = {
        save: jest.fn(async (record) => ({ ...record, id: 'asset-1' })),
      };
      const manager = {
        getRepository: jest.fn((entity) => {
          if (entity === HostProfile) return hostTransactionRepository;
          if (entity === HostVerificationAsset)
            return assetTransactionRepository;
          return migrationRepository;
        }),
      };
      const assetRepository = {
        findOne: jest.fn(async () => null),
        create: jest.fn((record) => record),
        manager: {
          transaction: jest.fn(async (callback) => callback(manager)),
        },
      };
      const storageService = {
        readLegacyPublicObject: options?.readError
          ? jest.fn(async () => {
              throw options.readError;
            })
          : jest.fn(async () => ({
              buffer: options?.invalid ? Buffer.from('invalid') : JPEG,
              originalFilename: 'identity.jpg',
              mimeType: 'image/jpeg',
              size: options?.invalid ? 7 : JPEG.length,
            })),
        quarantineLegacyPublicObject: jest.fn(async () => undefined),
        generatePrivateStorageKey: jest.fn(
          () => 'host-verification/opaque/GOVERNMENT_ID/asset.jpg',
        ),
        writePrivateObject: jest.fn(async () => 'local'),
        deletePrivateObject: jest.fn(async () => true),
      };
      const service = new LegacyHostVerificationMigrationService(
        { find: jest.fn(async () => [currentHost]) } as never,
        assetRepository as never,
        migrationRepository as never,
        storageService as unknown as StorageService,
        {
          get: jest.fn((_key, fallback) => fallback),
        } as unknown as ConfigService,
      );

      return {
        service,
        storageService,
        migrationRecords,
        transactionalHost,
        assetTransactionRepository,
      };
    }

    it('previews candidates without moving or writing files', async () => {
      const { service, storageService } = harness();
      const result = await service.preview();

      expect(result.mode).toBe('PREVIEW');
      expect(result.candidates).toBe(1);
      expect(storageService.readLegacyPublicObject).not.toHaveBeenCalled();
      expect(storageService.writePrivateObject).not.toHaveBeenCalled();
    });

    it('migrates valid content, quarantines the public source, and clears its URL', async () => {
      const {
        service,
        storageService,
        migrationRecords,
        transactionalHost,
        assetTransactionRepository,
      } = harness();
      const result = await service.execute();

      expect(result.migrated).toBe(1);
      expect(result.requiresReupload).toBe(0);
      expect(storageService.quarantineLegacyPublicObject).toHaveBeenCalledTimes(
        1,
      );
      expect(storageService.writePrivateObject).toHaveBeenCalledTimes(1);
      expect(assetTransactionRepository.save).toHaveBeenCalledTimes(1);
      expect(transactionalHost.documentUrl).toBe('');
      expect(migrationRecords[0]).toEqual(
        expect.objectContaining({
          status: LegacyHostAssetMigrationStatus.MIGRATED,
          category: PrivateDocumentCategory.GOVERNMENT_ID,
          assetId: 'asset-1',
          failureCode: null,
        }),
      );
      expect(migrationRecords[0]).not.toHaveProperty('sourceUrl');
    });

    it('marks a missing source for secure re-upload without fabricating an asset', async () => {
      const { service, storageService, migrationRecords } = harness({
        readError: new Error('Legacy public source file was not found'),
      });
      const result = await service.execute();

      expect(result.requiresReupload).toBe(1);
      expect(storageService.writePrivateObject).not.toHaveBeenCalled();
      expect(migrationRecords[0]).toEqual(
        expect.objectContaining({
          status: LegacyHostAssetMigrationStatus.REQUIRES_REUPLOAD,
          failureCode: 'SOURCE_NOT_FOUND',
          quarantineStorageKey: null,
        }),
      );
    });

    it('quarantines invalid content and marks it for re-upload', async () => {
      const { service, storageService, migrationRecords } = harness({
        invalid: true,
      });
      const result = await service.execute();

      expect(result.requiresReupload).toBe(1);
      expect(storageService.quarantineLegacyPublicObject).toHaveBeenCalled();
      expect(storageService.writePrivateObject).not.toHaveBeenCalled();
      expect(migrationRecords[0]).toEqual(
        expect.objectContaining({
          failureCode: 'VALIDATION_FAILED',
          publicSourceRetiredAt: expect.any(Date),
        }),
      );
    });
  });

  describe('persistence, discovery, and manual-only execution', () => {
    it('maps safe report fields without storing a raw source URL or physical path', () => {
      const columns = getMetadataArgsStorage()
        .columns.filter(
          (column) => column.target === HostVerificationLegacyMigration,
        )
        .map((column) => column.propertyName);

      expect(columns).toEqual(
        expect.arrayContaining([
          'hostProfileId',
          'ownerUserId',
          'category',
          'sourceFingerprint',
          'sourceFilename',
          'quarantineStorageKey',
          'status',
          'assetId',
          'failureCode',
          'failureDetail',
          'publicSourceRetiredAt',
        ]),
      );
      expect(columns).not.toEqual(
        expect.arrayContaining(['sourceUrl', 'absolutePath', 'physicalPath']),
      );
    });

    it('keeps execution out of application startup and exposes explicit commands', () => {
      const main = fs.readFileSync(
        path.join(process.cwd(), 'src/main.ts'),
        'utf8',
      );
      const appModule = fs.readFileSync(
        path.join(process.cwd(), 'src/app.module.ts'),
        'utf8',
      );
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'),
      ) as { scripts: Record<string, string> };

      expect(main).not.toContain('migrate-legacy-host-verification');
      expect(appModule).not.toContain('migration.execute');
      expect(
        packageJson.scripts['host-verification:migration:preview'],
      ).toEqual(expect.any(String));
      expect(packageJson.scripts['host-verification:migration:run']).toContain(
        '--execute',
      );
      expect(
        packageJson.scripts['host-verification:migration:report'],
      ).toContain('--report');
    });

    it('discovers a non-destructive migration with a valid rollback', async () => {
      const migration =
        new Phase08HostVerificationLegacyMigrationTracking1700000000007();
      const upQueries: string[] = [];
      const downQueries: string[] = [];
      const upRunner = {
        query: jest.fn(async (sql: string) => upQueries.push(sql)),
      } as unknown as QueryRunner;
      const downRunner = {
        query: jest.fn(async (sql: string) => downQueries.push(sql)),
      } as unknown as QueryRunner;

      await migration.up(upRunner);
      await migration.down(downRunner);

      expect(AppDataSource.options.synchronize).toBe(false);
      expect(AppDataSource.options.migrationsRun).toBe(false);
      expect(upQueries.join(' ')).toContain(
        'CREATE TABLE IF NOT EXISTS "host_verification_legacy_migrations"',
      );
      expect(upQueries.join(' ')).not.toContain('DROP TABLE');
      expect(downQueries.join(' ')).toContain(
        'DROP TABLE IF EXISTS "host_verification_legacy_migrations"',
      );
    });

    it('runs the tracking migration up and down against PostgreSQL semantics', async () => {
      const db = newDb();
      db.public.registerFunction({
        name: 'version',
        implementation: () => 'PostgreSQL 15.0 (pg-mem)',
      });
      db.public.registerFunction({
        name: 'current_database',
        implementation: () => 'voicecloud_test',
      });
      db.public.registerFunction({
        name: 'gen_random_uuid',
        returns: DataType.uuid,
        impure: true,
        implementation: () => '00000000-0000-4000-8000-000000000001',
      });
      const dataSource = db.adapters.createTypeormDataSource({
        type: 'postgres',
        entities: [],
        synchronize: false,
      });
      await dataSource.initialize();
      const runner = dataSource.createQueryRunner();
      await runner.connect();

      try {
        await runner.query(
          'CREATE TABLE "users" ("id" uuid NOT NULL PRIMARY KEY)',
        );
        await runner.query(
          'CREATE TABLE "host_profiles" ("id" uuid NOT NULL PRIMARY KEY)',
        );
        await runner.query(
          'CREATE TABLE "host_verification_assets" ("id" uuid NOT NULL PRIMARY KEY)',
        );
        const migration =
          new Phase08HostVerificationLegacyMigrationTracking1700000000007();
        await migration.up(runner);
        const tables = (await runner.query(
          `SELECT "table_name" FROM "information_schema"."tables" WHERE "table_name" = 'host_verification_legacy_migrations'`,
        )) as Array<{ table_name: string }>;
        expect(tables.length).toBeGreaterThan(0);

        await migration.down(runner);
        const removed = (await runner.query(
          `SELECT "table_name" FROM "information_schema"."tables" WHERE "table_name" = 'host_verification_legacy_migrations'`,
        )) as Array<{ table_name: string }>;
        expect(removed).toHaveLength(0);
      } finally {
        await runner.release();
        await dataSource.destroy();
      }
    });
  });
});
