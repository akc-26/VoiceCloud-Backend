import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase16AuthenticationIdentityPlatform1700000000003 implements MigrationInterface {
  name = 'Phase16AuthenticationIdentityPlatform1700000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Update users table with authentication & identity fields
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "phoneNumber" varchar,
      ADD COLUMN IF NOT EXISTS "phoneVerified" boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "isGuest" boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "role" varchar NOT NULL DEFAULT 'USER',
      ADD COLUMN IF NOT EXISTS "referralCode" varchar,
      ADD COLUMN IF NOT EXISTS "referredByUserId" varchar,
      ADD COLUMN IF NOT EXISTS "passwordHash" varchar,
      ADD COLUMN IF NOT EXISTS "failedLoginAttempts" integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "lockoutUntil" TIMESTAMP;
    `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_users_phoneNumber" ON "users" ("phoneNumber") WHERE "phoneNumber" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_users_referralCode" ON "users" ("referralCode") WHERE "referralCode" IS NOT NULL`,
    );

    // 2. Update user_devices table
    await queryRunner.query(`
      ALTER TABLE "user_devices"
      ADD COLUMN IF NOT EXISTS "manufacturer" varchar,
      ADD COLUMN IF NOT EXISTS "model" varchar,
      ADD COLUMN IF NOT EXISTS "lastIp" varchar,
      ADD COLUMN IF NOT EXISTS "status" varchar NOT NULL DEFAULT 'ACTIVE';
    `);

    // 3. Update user_sessions table
    await queryRunner.query(`
      ALTER TABLE "user_sessions"
      ADD COLUMN IF NOT EXISTS "deviceId" varchar,
      ADD COLUMN IF NOT EXISTS "refreshTokenHash" varchar,
      ADD COLUMN IF NOT EXISTS "status" varchar NOT NULL DEFAULT 'ACTIVE';
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_user_sessions_deviceId" ON "user_sessions" ("deviceId")`,
    );

    // 4. Update user_connection_history table
    await queryRunner.query(`
      ALTER TABLE "user_connection_history"
      ADD COLUMN IF NOT EXISTS "deviceId" varchar,
      ADD COLUMN IF NOT EXISTS "loginMethod" varchar,
      ADD COLUMN IF NOT EXISTS "country" varchar,
      ADD COLUMN IF NOT EXISTS "platform" varchar;
    `);

    // 5. Create otp_verifications table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "otp_verifications" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "phoneNumber" character varying NOT NULL,
        "otpCode" character varying NOT NULL,
        "attempts" integer NOT NULL DEFAULT 0,
        "isVerified" boolean NOT NULL DEFAULT false,
        "expiresAt" TIMESTAMP NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_otp_verifications_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_otp_verifications_phoneNumber" ON "otp_verifications" ("phoneNumber")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "otp_verifications"`);
    await queryRunner.query(`
      ALTER TABLE "user_connection_history"
      DROP COLUMN IF EXISTS "deviceId",
      DROP COLUMN IF EXISTS "loginMethod",
      DROP COLUMN IF EXISTS "country",
      DROP COLUMN IF EXISTS "platform";
    `);
    await queryRunner.query(`
      ALTER TABLE "user_sessions"
      DROP COLUMN IF EXISTS "deviceId",
      DROP COLUMN IF EXISTS "refreshTokenHash",
      DROP COLUMN IF EXISTS "status";
    `);
    await queryRunner.query(`
      ALTER TABLE "user_devices"
      DROP COLUMN IF EXISTS "manufacturer",
      DROP COLUMN IF EXISTS "model",
      DROP COLUMN IF EXISTS "lastIp",
      DROP COLUMN IF EXISTS "status";
    `);
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "phoneNumber",
      DROP COLUMN IF EXISTS "phoneVerified",
      DROP COLUMN IF EXISTS "isGuest",
      DROP COLUMN IF EXISTS "role",
      DROP COLUMN IF EXISTS "referralCode",
      DROP COLUMN IF EXISTS "referredByUserId",
      DROP COLUMN IF EXISTS "passwordHash",
      DROP COLUMN IF EXISTS "failedLoginAttempts",
      DROP COLUMN IF EXISTS "lockoutUntil";
    `);
  }
}
