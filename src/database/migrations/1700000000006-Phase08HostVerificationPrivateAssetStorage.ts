import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase08HostVerificationPrivateAssetStorage1700000000006 implements MigrationInterface {
  name = 'Phase08HostVerificationPrivateAssetStorage1700000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "host_verification_assets" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "ownerUserId" uuid NOT NULL,
        "hostProfileId" uuid,
        "category" character varying(64) NOT NULL,
        "originalFilename" character varying(255) NOT NULL,
        "storageKey" character varying(512) NOT NULL,
        "verifiedMimeType" character varying(127) NOT NULL,
        "verifiedFormat" character varying(32) NOT NULL,
        "fileSize" bigint NOT NULL,
        "storageProvider" character varying(64) NOT NULL,
        "visibility" character varying(16) NOT NULL DEFAULT 'PRIVATE',
        "validationStatus" character varying(32) NOT NULL DEFAULT 'PENDING',
        "isActive" boolean NOT NULL DEFAULT true,
        "retiredAt" TIMESTAMP,
        "replacedByAssetId" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_host_verification_assets_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_host_verification_assets_storageKey" UNIQUE ("storageKey"),
        CONSTRAINT "CHK_host_verification_assets_fileSize" CHECK ("fileSize" >= 0),
        CONSTRAINT "CHK_host_verification_assets_visibility" CHECK ("visibility" = 'PRIVATE'),
        CONSTRAINT "CHK_host_verification_assets_category" CHECK ("category" IN ('GOVERNMENT_ID', 'SELFIE', 'SUPPORTING_DOCUMENT')),
        CONSTRAINT "CHK_host_verification_assets_validationStatus" CHECK ("validationStatus" IN ('PENDING', 'VALIDATED', 'REJECTED'))
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_host_verification_assets_ownerUserId" ON "host_verification_assets" ("ownerUserId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_host_verification_assets_hostProfileId" ON "host_verification_assets" ("hostProfileId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_host_verification_assets_category" ON "host_verification_assets" ("category")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_host_verification_assets_isActive" ON "host_verification_assets" ("isActive")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_host_verification_assets_owner_category_active" ON "host_verification_assets" ("ownerUserId", "category", "isActive")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_host_verification_assets_host_category_active" ON "host_verification_assets" ("hostProfileId", "category", "isActive")`,
    );

    await queryRunner.query(`
      ALTER TABLE "host_verification_assets"
      ADD CONSTRAINT "FK_host_verification_assets_ownerUserId"
      FOREIGN KEY ("ownerUserId") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "host_verification_assets"
      ADD CONSTRAINT "FK_host_verification_assets_hostProfileId"
      FOREIGN KEY ("hostProfileId") REFERENCES "host_profiles"("id")
      ON DELETE SET NULL ON UPDATE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "host_verification_assets"
      ADD CONSTRAINT "FK_host_verification_assets_replacedByAssetId"
      FOREIGN KEY ("replacedByAssetId") REFERENCES "host_verification_assets"("id")
      ON DELETE SET NULL ON UPDATE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "host_verification_assets" DROP CONSTRAINT IF EXISTS "FK_host_verification_assets_replacedByAssetId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "host_verification_assets" DROP CONSTRAINT IF EXISTS "FK_host_verification_assets_hostProfileId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "host_verification_assets" DROP CONSTRAINT IF EXISTS "FK_host_verification_assets_ownerUserId"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "host_verification_assets"`);
  }
}
