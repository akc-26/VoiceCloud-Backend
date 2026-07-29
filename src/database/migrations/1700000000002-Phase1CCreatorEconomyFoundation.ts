import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase1CCreatorEconomyFoundation1700000000002 implements MigrationInterface {
  name = 'Phase1CCreatorEconomyFoundation1700000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create creator_plans table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "creator_plans" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "creatorId" uuid NOT NULL,
        "title" character varying NOT NULL,
        "description" text NOT NULL DEFAULT '',
        "monthlyPrice" numeric(10,2) NOT NULL DEFAULT 0,
        "yearlyPrice" numeric(10,2),
        "benefits" jsonb NOT NULL DEFAULT '[]',
        "visibility" character varying NOT NULL DEFAULT 'PUBLIC',
        "status" character varying NOT NULL DEFAULT 'ACTIVE',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_creator_plans_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_creator_plans_creatorId" ON "creator_plans" ("creatorId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_creator_plans_status" ON "creator_plans" ("status")`,
    );

    // 2. Create creator_subscriptions table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "creator_subscriptions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "subscriberId" uuid NOT NULL,
        "creatorId" uuid NOT NULL,
        "planId" uuid NOT NULL,
        "status" character varying NOT NULL DEFAULT 'ACTIVE',
        "autoRenew" boolean NOT NULL DEFAULT true,
        "startedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "expiresAt" TIMESTAMP,
        "cancelledAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_creator_subscriptions_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_creator_subscriptions_subscriberId" ON "creator_subscriptions" ("subscriberId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_creator_subscriptions_creatorId" ON "creator_subscriptions" ("creatorId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_creator_subscriptions_planId" ON "creator_subscriptions" ("planId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_creator_subscriptions_status" ON "creator_subscriptions" ("status")`,
    );

    // 3. Create creator_payout_requests table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "creator_payout_requests" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "creatorId" uuid NOT NULL,
        "diamondAmount" bigint NOT NULL DEFAULT 0,
        "payoutAmount" numeric(10,2) NOT NULL DEFAULT 0,
        "payoutMethod" character varying NOT NULL DEFAULT 'BANK_TRANSFER',
        "accountDetails" jsonb,
        "status" character varying NOT NULL DEFAULT 'PENDING',
        "reviewedBy" uuid,
        "reviewedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_creator_payout_requests_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_creator_payout_requests_creatorId" ON "creator_payout_requests" ("creatorId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_creator_payout_requests_status" ON "creator_payout_requests" ("status")`,
    );

    // 4. Foreign Key Constraints
    await queryRunner.query(`
      ALTER TABLE "creator_plans"
      ADD CONSTRAINT "FK_creator_plans_creator"
      FOREIGN KEY ("creatorId") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "creator_subscriptions"
      ADD CONSTRAINT "FK_creator_subscriptions_subscriber"
      FOREIGN KEY ("subscriberId") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "creator_subscriptions"
      ADD CONSTRAINT "FK_creator_subscriptions_creator"
      FOREIGN KEY ("creatorId") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "creator_subscriptions"
      ADD CONSTRAINT "FK_creator_subscriptions_plan"
      FOREIGN KEY ("planId") REFERENCES "creator_plans"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "creator_payout_requests"
      ADD CONSTRAINT "FK_creator_payout_requests_creator"
      FOREIGN KEY ("creatorId") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "creator_payout_requests"
      ADD CONSTRAINT "FK_creator_payout_requests_reviewer"
      FOREIGN KEY ("reviewedBy") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "creator_payout_requests" DROP CONSTRAINT IF EXISTS "FK_creator_payout_requests_reviewer"`,
    );
    await queryRunner.query(
      `ALTER TABLE "creator_payout_requests" DROP CONSTRAINT IF EXISTS "FK_creator_payout_requests_creator"`,
    );

    await queryRunner.query(
      `ALTER TABLE "creator_subscriptions" DROP CONSTRAINT IF EXISTS "FK_creator_subscriptions_plan"`,
    );
    await queryRunner.query(
      `ALTER TABLE "creator_subscriptions" DROP CONSTRAINT IF EXISTS "FK_creator_subscriptions_creator"`,
    );
    await queryRunner.query(
      `ALTER TABLE "creator_subscriptions" DROP CONSTRAINT IF EXISTS "FK_creator_subscriptions_subscriber"`,
    );

    await queryRunner.query(
      `ALTER TABLE "creator_plans" DROP CONSTRAINT IF EXISTS "FK_creator_plans_creator"`,
    );

    await queryRunner.query(`DROP TABLE IF EXISTS "creator_payout_requests"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "creator_subscriptions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "creator_plans"`);
  }
}
