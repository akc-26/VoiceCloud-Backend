import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase08RewardsVipNotificationRecovery1700000000013 implements MigrationInterface {
  name = 'Phase08RewardsVipNotificationRecovery1700000000013';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "reward_audit_logs"
        ADD COLUMN IF NOT EXISTS "operationKey" varchar NULL,
        ADD COLUMN IF NOT EXISTS "walletTransactionId" uuid NULL,
        ADD COLUMN IF NOT EXISTS "settledAt" timestamp NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_reward_audit_logs_operationKey"
      ON "reward_audit_logs" ("operationKey")
      WHERE "operationKey" IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "lucky_box_openings" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "operationKey" varchar NOT NULL,
        "userId" varchar NOT NULL,
        "tier" varchar NOT NULL,
        "count" integer NOT NULL,
        "roomId" varchar NULL,
        "totalCost" bigint NOT NULL,
        "cashbackCoins" bigint NOT NULL DEFAULT 0,
        "debitWalletTransactionId" uuid NOT NULL,
        "cashbackWalletTransactionId" uuid NULL,
        "resultPayload" jsonb NOT NULL,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_lucky_box_openings" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_lucky_box_openings_count_positive" CHECK ("count" > 0),
        CONSTRAINT "CHK_lucky_box_openings_cost_positive" CHECK ("totalCost" > 0)
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_lucky_box_openings_operationKey"
      ON "lucky_box_openings" ("operationKey")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_lucky_box_openings_userId"
      ON "lucky_box_openings" ("userId")
    `);

    await queryRunner.query(`
      ALTER TABLE "host_rewards"
        ADD COLUMN IF NOT EXISTS "claimOperationKey" varchar NULL,
        ADD COLUMN IF NOT EXISTS "walletTransactionId" uuid NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_host_rewards_claimOperationKey"
      ON "host_rewards" ("claimOperationKey")
      WHERE "claimOperationKey" IS NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "vip_transactions"
        ADD COLUMN IF NOT EXISTS "operationKey" varchar NULL,
        ADD COLUMN IF NOT EXISTS "paymentProvider" varchar NULL,
        ADD COLUMN IF NOT EXISTS "paymentReference" varchar NULL,
        ADD COLUMN IF NOT EXISTS "currency" varchar NOT NULL DEFAULT 'USD',
        ADD COLUMN IF NOT EXISTS "walletTransactionId" uuid NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_vip_transactions_operationKey"
      ON "vip_transactions" ("operationKey")
      WHERE "operationKey" IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_vip_transactions_provider_reference"
      ON "vip_transactions" ("paymentProvider", "paymentReference")
      WHERE "paymentProvider" IS NOT NULL AND "paymentReference" IS NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "vip_reward_claims"
        ADD COLUMN IF NOT EXISTS "operationKey" varchar NULL,
        ADD COLUMN IF NOT EXISTS "walletTransactionId" uuid NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_vip_reward_claims_operationKey"
      ON "vip_reward_claims" ("operationKey")
      WHERE "operationKey" IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_vip_reward_claims_period"
      ON "vip_reward_claims" ("userId", "rewardId", "periodKey")
    `);

    await queryRunner.query(`
      ALTER TABLE "notifications"
        ADD COLUMN IF NOT EXISTS "operationKey" varchar NULL,
        ADD COLUMN IF NOT EXISTS "deliveryStatus" varchar NULL,
        ADD COLUMN IF NOT EXISTS "deliveryAttemptCount" integer NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "lastDeliveryAttemptAt" timestamp NULL,
        ADD COLUMN IF NOT EXISTS "deliveredAt" timestamp NULL,
        ADD COLUMN IF NOT EXISTS "lastDeliveryError" text NULL
    `);
    await queryRunner.query(`
      UPDATE "notifications"
      SET "deliveryStatus" = 'SENT'
      WHERE "deliveryStatus" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "notifications"
        ALTER COLUMN "deliveryStatus" SET DEFAULT 'PENDING',
        ALTER COLUMN "deliveryStatus" SET NOT NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_notifications_operationKey"
      ON "notifications" ("operationKey")
      WHERE "operationKey" IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_notifications_deliveryStatus"
      ON "notifications" ("deliveryStatus")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_notifications_deliveryStatus"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_notifications_operationKey"`,
    );
    await queryRunner.query(`
      ALTER TABLE "notifications"
        DROP COLUMN IF EXISTS "lastDeliveryError",
        DROP COLUMN IF EXISTS "deliveredAt",
        DROP COLUMN IF EXISTS "lastDeliveryAttemptAt",
        DROP COLUMN IF EXISTS "deliveryAttemptCount",
        DROP COLUMN IF EXISTS "deliveryStatus",
        DROP COLUMN IF EXISTS "operationKey"
    `);

    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_vip_reward_claims_period"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_vip_reward_claims_operationKey"`,
    );
    await queryRunner.query(`
      ALTER TABLE "vip_reward_claims"
        DROP COLUMN IF EXISTS "walletTransactionId",
        DROP COLUMN IF EXISTS "operationKey"
    `);

    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_vip_transactions_provider_reference"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_vip_transactions_operationKey"`,
    );
    await queryRunner.query(`
      ALTER TABLE "vip_transactions"
        DROP COLUMN IF EXISTS "walletTransactionId",
        DROP COLUMN IF EXISTS "currency",
        DROP COLUMN IF EXISTS "paymentReference",
        DROP COLUMN IF EXISTS "paymentProvider",
        DROP COLUMN IF EXISTS "operationKey"
    `);

    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_host_rewards_claimOperationKey"`,
    );
    await queryRunner.query(`
      ALTER TABLE "host_rewards"
        DROP COLUMN IF EXISTS "walletTransactionId",
        DROP COLUMN IF EXISTS "claimOperationKey"
    `);

    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_lucky_box_openings_userId"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_lucky_box_openings_operationKey"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "lucky_box_openings"`);

    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_reward_audit_logs_operationKey"`,
    );
    await queryRunner.query(`
      ALTER TABLE "reward_audit_logs"
        DROP COLUMN IF EXISTS "settledAt",
        DROP COLUMN IF EXISTS "walletTransactionId",
        DROP COLUMN IF EXISTS "operationKey"
    `);
  }
}
