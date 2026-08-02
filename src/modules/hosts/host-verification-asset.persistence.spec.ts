import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataType, newDb } from 'pg-mem';
import { getMetadataArgsStorage, QueryRunner } from 'typeorm';
import { AppDataSource } from '../../database/data-source';
import { Phase08HostVerificationPrivateAssetStorage1700000000006 } from '../../database/migrations/1700000000006-Phase08HostVerificationPrivateAssetStorage';
import {
  PrivateAssetValidationStatus,
  PrivateAssetVisibility,
} from '../storage/enums/private-asset.enum';
import { PrivateDocumentCategory } from '../storage/enums/private-document-category.enum';
import { HostVerificationAsset } from './entities/host-verification-asset.entity';
import { HostsModule } from './hosts.module';

describe('Private Host Verification Asset Persistence Foundation (B2A-1B)', () => {
  const metadata = getMetadataArgsStorage();

  it('1. Maps the entity to the private Host verification asset table', () => {
    const table = metadata.tables.find(
      (candidate) => candidate.target === HostVerificationAsset,
    );

    expect(table?.name).toBe('host_verification_assets');
  });

  it('2. Maps every required persistence field without a physical path', () => {
    const columns = metadata.columns
      .filter((column) => column.target === HostVerificationAsset)
      .map((column) => column.propertyName);

    expect(columns).toEqual(
      expect.arrayContaining([
        'id',
        'ownerUserId',
        'hostProfileId',
        'category',
        'originalFilename',
        'storageKey',
        'verifiedMimeType',
        'verifiedFormat',
        'fileSize',
        'storageProvider',
        'visibility',
        'validationStatus',
        'isActive',
        'retiredAt',
        'replacedByAssetId',
        'createdAt',
        'updatedAt',
      ]),
    );
    expect(columns).not.toEqual(
      expect.arrayContaining(['filePath', 'absolutePath', 'publicUrl']),
    );
  });

  it('3. Preserves the approved private document category mapping', () => {
    expect(Object.values(PrivateDocumentCategory)).toEqual([
      'GOVERNMENT_ID',
      'SELFIE',
      'SUPPORTING_DOCUMENT',
    ]);
  });

  it('4. Restricts persisted asset visibility to PRIVATE', () => {
    expect(Object.values(PrivateAssetVisibility)).toEqual(['PRIVATE']);

    const visibilityColumn = metadata.columns.find(
      (column) =>
        column.target === HostVerificationAsset &&
        column.propertyName === 'visibility',
    );
    expect(visibilityColumn?.options.default).toBe(
      PrivateAssetVisibility.PRIVATE,
    );
  });

  it('5. Maps explicit private-asset validation states', () => {
    expect(Object.values(PrivateAssetValidationStatus)).toEqual([
      'PENDING',
      'VALIDATED',
      'REJECTED',
    ]);
  });

  it('6. Keeps storage keys unique while storing only logical keys', () => {
    const storageKeyColumn = metadata.columns.find(
      (column) =>
        column.target === HostVerificationAsset &&
        column.propertyName === 'storageKey',
    );

    expect(storageKeyColumn?.options.unique).toBe(true);
    expect(storageKeyColumn?.options.length).toBe(512);
  });

  it('7. Maps owner, optional Host profile, and replacement relations safely', () => {
    const relations = metadata.relations.filter(
      (relation) => relation.target === HostVerificationAsset,
    );
    const owner = relations.find(
      (relation) => relation.propertyName === 'owner',
    );
    const hostProfile = relations.find(
      (relation) => relation.propertyName === 'hostProfile',
    );
    const replacement = relations.find(
      (relation) => relation.propertyName === 'replacedByAsset',
    );

    expect(owner?.options.onDelete).toBe('CASCADE');
    expect(hostProfile?.options.nullable).toBe(true);
    expect(hostProfile?.options.onDelete).toBe('SET NULL');
    expect(replacement?.options.nullable).toBe(true);
    expect(replacement?.options.onDelete).toBe('SET NULL');
  });

  it('8. Permits multiple active supporting-document records', () => {
    const indices = metadata.indices.filter(
      (index) => index.target === HostVerificationAsset,
    );
    const uniqueCompositeIndex = indices.find((index) => {
      const columns = Array.isArray(index.columns) ? index.columns : [];
      return (
        index.unique === true &&
        columns.includes('ownerUserId') &&
        columns.includes('category') &&
        columns.includes('isActive')
      );
    });

    const first = Object.assign(new HostVerificationAsset(), {
      ownerUserId: '11111111-1111-1111-1111-111111111111',
      category: PrivateDocumentCategory.SUPPORTING_DOCUMENT,
      storageKey: 'host-verification/a/SUPPORTING_DOCUMENT/first.pdf',
      isActive: true,
    });
    const second = Object.assign(new HostVerificationAsset(), {
      ownerUserId: first.ownerUserId,
      category: PrivateDocumentCategory.SUPPORTING_DOCUMENT,
      storageKey: 'host-verification/b/SUPPORTING_DOCUMENT/second.pdf',
      isActive: true,
    });

    expect(uniqueCompositeIndex).toBeUndefined();
    expect(first.isActive).toBe(true);
    expect(second.isActive).toBe(true);
    expect(first.storageKey).not.toBe(second.storageKey);
  });

  it('9. Registers the entity with the existing Hosts TypeORM feature module', () => {
    const imports = Reflect.getMetadata('imports', HostsModule) || [];
    const typeOrmFeature = imports.find(
      (entry: { module?: unknown }) => entry?.module === TypeOrmModule,
    );
    const providers = typeOrmFeature?.providers || [];

    expect(
      providers.some(
        (provider: { provide?: unknown }) =>
          provider.provide === getRepositoryToken(HostVerificationAsset),
      ),
    ).toBe(true);
  });

  it('10. Discovers migrations through a non-synchronizing data source', () => {
    const migrations = AppDataSource.options.migrations;
    const migrationEntries = Array.isArray(migrations) ? migrations : [];

    expect(AppDataSource.options.synchronize).toBe(false);
    expect(AppDataSource.options.migrationsRun).toBe(false);
    expect(
      migrationEntries.some(
        (entry) =>
          typeof entry === 'string' &&
          entry.includes(`${path.sep}migrations${path.sep}`),
      ),
    ).toBe(true);
  });

  it('11. Provides status, run, and revert migration commands', () => {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'),
    ) as { scripts: Record<string, string> };

    expect(packageJson.scripts['migration:status']).toContain('migration:show');
    expect(packageJson.scripts['migration:run']).toContain('migration:run');
    expect(packageJson.scripts['migration:revert']).toContain(
      'migration:revert',
    );
    expect(packageJson.scripts['migration:run']).toContain(
      'src/database/data-source.ts',
    );
  });

  it('12. Defines non-destructive migration up and valid rollback structure', async () => {
    const migration =
      new Phase08HostVerificationPrivateAssetStorage1700000000006();
    const upQueries: string[] = [];
    const downQueries: string[] = [];
    const upRunner = {
      query: jest.fn((sql: string) => {
        upQueries.push(sql.replace(/\s+/g, ' ').trim());
        return Promise.resolve();
      }),
    } as unknown as QueryRunner;
    const downRunner = {
      query: jest.fn((sql: string) => {
        downQueries.push(sql.replace(/\s+/g, ' ').trim());
        return Promise.resolve();
      }),
    } as unknown as QueryRunner;

    await migration.up(upRunner);
    await migration.down(downRunner);

    const upSql = upQueries.join(' ');
    const downSql = downQueries.join(' ');

    expect(migration.name).toBe(
      'Phase08HostVerificationPrivateAssetStorage1700000000006',
    );
    expect(upSql).toContain(
      'CREATE TABLE IF NOT EXISTS "host_verification_assets"',
    );
    expect(upSql).toContain('IDX_host_verification_assets_ownerUserId');
    expect(upSql).toContain('IDX_host_verification_assets_hostProfileId');
    expect(upSql).toContain('IDX_host_verification_assets_category');
    expect(upSql).toContain('IDX_host_verification_assets_isActive');
    expect(upSql).toContain('FK_host_verification_assets_ownerUserId');
    expect(upSql).toContain('FK_host_verification_assets_hostProfileId');
    expect(upSql).not.toContain('DROP TABLE');
    expect(downSql).toContain(
      'DROP TABLE IF EXISTS "host_verification_assets"',
    );
    expect(downQueries[downQueries.length - 1]).toContain(
      'DROP TABLE IF EXISTS',
    );
  });

  it('13. Runs migration up/down and persists multiple active supporting documents', async () => {
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
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      await queryRunner.query(
        `CREATE TABLE "users" ("id" uuid NOT NULL, CONSTRAINT "PK_test_users" PRIMARY KEY ("id"))`,
      );
      await queryRunner.query(
        `CREATE TABLE "host_profiles" ("id" uuid NOT NULL, CONSTRAINT "PK_test_host_profiles" PRIMARY KEY ("id"))`,
      );

      const migration =
        new Phase08HostVerificationPrivateAssetStorage1700000000006();
      await migration.up(queryRunner);

      const ownerUserId = '11111111-1111-4111-8111-111111111111';
      const hostProfileId = '22222222-2222-4222-8222-222222222222';
      await queryRunner.query(`INSERT INTO "users" ("id") VALUES ($1)`, [
        ownerUserId,
      ]);
      await queryRunner.query(
        `INSERT INTO "host_profiles" ("id") VALUES ($1)`,
        [hostProfileId],
      );

      const insertSupportingDocument = async (id: string, storageKey: string) =>
        queryRunner.query(
          `INSERT INTO "host_verification_assets" (
            "id", "ownerUserId", "hostProfileId", "category",
            "originalFilename", "storageKey", "verifiedMimeType",
            "verifiedFormat", "fileSize", "storageProvider"
          ) VALUES ($1, $2, $3, 'SUPPORTING_DOCUMENT', $4, $5, 'application/pdf', 'PDF', 1024, 'local')`,
          [
            id,
            ownerUserId,
            hostProfileId,
            'supporting-document.pdf',
            storageKey,
          ],
        );

      await insertSupportingDocument(
        '33333333-3333-4333-8333-333333333333',
        'host-verification/a/SUPPORTING_DOCUMENT/first.pdf',
      );
      await insertSupportingDocument(
        '44444444-4444-4444-8444-444444444444',
        'host-verification/b/SUPPORTING_DOCUMENT/second.pdf',
      );

      const rows = (await queryRunner.query(
        `SELECT "category", "visibility", "isActive" FROM "host_verification_assets" ORDER BY "storageKey"`,
      )) as Array<{
        category: string;
        visibility: string;
        isActive: boolean;
      }>;

      expect(rows).toHaveLength(2);
      expect(rows.every((row) => row.isActive)).toBe(true);
      expect(rows.every((row) => row.visibility === 'PRIVATE')).toBe(true);
      expect(rows.every((row) => row.category === 'SUPPORTING_DOCUMENT')).toBe(
        true,
      );

      await migration.down(queryRunner);
      const tables = (await queryRunner.query(
        `SELECT "table_name" FROM "information_schema"."tables" WHERE "table_name" = 'host_verification_assets'`,
      )) as Array<{ table_name: string }>;
      expect(tables).toHaveLength(0);
    } finally {
      await queryRunner.release();
      await dataSource.destroy();
    }
  });
});
