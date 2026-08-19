import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase08CreatorPayoutLifecycle1700000000011
  implements MigrationInterface
{
  name = 'Phase08CreatorPayoutLifecycle1700000000011';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "creator_payout_requests"
        ADD COLUMN IF NOT EXISTS "reservedAt" timestamp NULL,
        ADD COLUMN IF NOT EXISTS "settledAt" timestamp NULL,
        ADD COLUMN IF NOT EXISTS "releasedAt" timestamp NULL,
        ADD COLUMN IF NOT EXISTS "operationGroupId" varchar NULL,
        ADD COLUMN IF NOT EXISTS "reserveOperationKey" varchar NULL,
        ADD COLUMN IF NOT EXISTS "reservationTransactionId" uuid NULL,
        ADD COLUMN IF NOT EXISTS "settlementTransactionId" uuid NULL,
        ADD COLUMN IF NOT EXISTS "releaseTransactionId" uuid NULL,
        ADD COLUMN IF NOT EXISTS "rejectionReason" text NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_creator_payout_requests_operationGroupId"
      ON "creator_payout_requests" ("operationGroupId")
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_creator_payout_requests_reserveOperationKey"
      ON "creator_payout_requests" ("reserveOperationKey")
      WHERE "reserveOperationKey" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_creator_payout_requests_reserveOperationKey"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_creator_payout_requests_operationGroupId"`,
    );
    await queryRunner.query(`
      ALTER TABLE "creator_payout_requests"
        DROP COLUMN IF EXISTS "rejectionReason",
        DROP COLUMN IF EXISTS "releaseTransactionId",
        DROP COLUMN IF EXISTS "settlementTransactionId",
        DROP COLUMN IF EXISTS "reservationTransactionId",
        DROP COLUMN IF EXISTS "reserveOperationKey",
        DROP COLUMN IF EXISTS "operationGroupId",
        DROP COLUMN IF EXISTS "releasedAt",
        DROP COLUMN IF EXISTS "settledAt",
        DROP COLUMN IF EXISTS "reservedAt"
    `);
  }
}
