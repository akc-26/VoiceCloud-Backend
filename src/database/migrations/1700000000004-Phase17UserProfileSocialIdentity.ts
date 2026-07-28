import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase17UserProfileSocialIdentity1700000000004 implements MigrationInterface {
  name = 'Phase17UserProfileSocialIdentity1700000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "statusMessage" varchar,
      ADD COLUMN IF NOT EXISTS "wealthLevel" integer NOT NULL DEFAULT 1,
      ADD COLUMN IF NOT EXISTS "charmLevel" integer NOT NULL DEFAULT 1,
      ADD COLUMN IF NOT EXISTS "wealthExp" integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "charmExp" integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "badges" json NOT NULL DEFAULT '[]',
      ADD COLUMN IF NOT EXISTS "customTags" json NOT NULL DEFAULT '[]',
      ADD COLUMN IF NOT EXISTS "privacySettings" json NOT NULL DEFAULT '{"showOnlineStatus":true,"showLastSeen":true,"allowDirectMessages":true,"showGifts":true}';
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_users_wealthLevel" ON "users" ("wealthLevel")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_users_charmLevel" ON "users" ("charmLevel")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_charmLevel"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_wealthLevel"`);

    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "privacySettings",
      DROP COLUMN IF EXISTS "customTags",
      DROP COLUMN IF EXISTS "badges",
      DROP COLUMN IF EXISTS "charmExp",
      DROP COLUMN IF EXISTS "wealthExp",
      DROP COLUMN IF EXISTS "charmLevel",
      DROP COLUMN IF EXISTS "wealthLevel",
      DROP COLUMN IF EXISTS "statusMessage";
    `);
  }
}
