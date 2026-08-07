import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase08HostFinancialAuthority1700000000012 implements MigrationInterface {
  name = 'Phase08HostFinancialAuthority1700000000012';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "host_earnings"
        ADD COLUMN IF NOT EXISTS "authorityInitializedAt" timestamp NULL,
        ADD COLUMN IF NOT EXISTS "authorityBaselineTransactionId" uuid NULL
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "host_settlement_requests" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "hostProfileId" varchar NOT NULL,
        "userId" varchar NOT NULL,
        "amount" numeric(12,2) NOT NULL,
        "settledAmount" numeric(12,2) NOT NULL DEFAULT 0,
        "status" varchar NOT NULL DEFAULT 'PENDING',
        "operationGroupId" varchar NOT NULL,
        "reserveOperationKey" varchar NOT NULL,
        "reservationTransactionId" uuid NULL,
        "settledAt" timestamp NULL,
        "settledBy" varchar NULL,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_host_settlement_requests" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_host_settlement_requests_amount_positive" CHECK ("amount" > 0),
        CONSTRAINT "CHK_host_settlement_requests_settled_range" CHECK ("settledAmount" >= 0 AND "settledAmount" <= "amount"),
        CONSTRAINT "CHK_host_settlement_requests_status" CHECK ("status" IN ('PENDING', 'SETTLED'))
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_host_settlement_requests_hostProfileId"
      ON "host_settlement_requests" ("hostProfileId")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_host_settlement_requests_userId"
      ON "host_settlement_requests" ("userId")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_host_settlement_requests_status"
      ON "host_settlement_requests" ("status")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_host_settlement_requests_operationGroupId"
      ON "host_settlement_requests" ("operationGroupId")
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_host_settlement_requests_reserveOperationKey"
      ON "host_settlement_requests" ("reserveOperationKey")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_host_settlement_requests_reserveOperationKey"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_host_settlement_requests_operationGroupId"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_host_settlement_requests_status"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_host_settlement_requests_userId"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_host_settlement_requests_hostProfileId"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "host_settlement_requests"`);
    await queryRunner.query(`
      ALTER TABLE "host_earnings"
        DROP COLUMN IF EXISTS "authorityBaselineTransactionId",
        DROP COLUMN IF EXISTS "authorityInitializedAt"
    `);
  }
}
