import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase08HostVerificationLegacyMigrationTracking1700000000007 implements MigrationInterface {
  name = 'Phase08HostVerificationLegacyMigrationTracking1700000000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "host_verification_legacy_migrations" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "hostProfileId" uuid NOT NULL,
        "ownerUserId" uuid NOT NULL,
        "category" character varying(64) NOT NULL,
        "sourceFingerprint" character(64) NOT NULL,
        "sourceFilename" character varying(255) NOT NULL,
        "quarantineStorageKey" character varying(512),
        "status" character varying(32) NOT NULL,
        "assetId" uuid,
        "failureCode" character varying(64),
        "failureDetail" character varying(255),
        "publicSourceRetiredAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_host_verification_legacy_migrations_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_host_verification_legacy_migrations_host_category" UNIQUE ("hostProfileId", "category"),
        CONSTRAINT "CHK_host_verification_legacy_migrations_category" CHECK ("category" IN ('GOVERNMENT_ID', 'SELFIE')),
        CONSTRAINT "CHK_host_verification_legacy_migrations_status" CHECK ("status" IN ('MIGRATED', 'REQUIRES_REUPLOAD'))
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_host_verification_legacy_migrations_hostProfileId" ON "host_verification_legacy_migrations" ("hostProfileId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_host_verification_legacy_migrations_ownerUserId" ON "host_verification_legacy_migrations" ("ownerUserId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_host_verification_legacy_migrations_status" ON "host_verification_legacy_migrations" ("status")`,
    );
    await queryRunner.query(`
      ALTER TABLE "host_verification_legacy_migrations"
      ADD CONSTRAINT "FK_host_verification_legacy_migrations_hostProfileId"
      FOREIGN KEY ("hostProfileId") REFERENCES "host_profiles"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "host_verification_legacy_migrations"
      ADD CONSTRAINT "FK_host_verification_legacy_migrations_ownerUserId"
      FOREIGN KEY ("ownerUserId") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "host_verification_legacy_migrations"
      ADD CONSTRAINT "FK_host_verification_legacy_migrations_assetId"
      FOREIGN KEY ("assetId") REFERENCES "host_verification_assets"("id")
      ON DELETE SET NULL ON UPDATE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "host_verification_legacy_migrations" DROP CONSTRAINT IF EXISTS "FK_host_verification_legacy_migrations_assetId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "host_verification_legacy_migrations" DROP CONSTRAINT IF EXISTS "FK_host_verification_legacy_migrations_ownerUserId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "host_verification_legacy_migrations" DROP CONSTRAINT IF EXISTS "FK_host_verification_legacy_migrations_hostProfileId"`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "host_verification_legacy_migrations"`,
    );
  }
}
