import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WP08-03-02A persistent wallet authority and idempotency fields.
 *
 * Historical rows remain valid because every new column is nullable. The
 * partial unique operation-key index allows unlimited legacy NULL rows while
 * making every new non-null financial operation key a database-level replay
 * barrier.
 */
export class Phase08EconomyWalletAuthority1700000000009
  implements MigrationInterface
{
  name = 'Phase08EconomyWalletAuthority1700000000009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "wallet_transactions" ADD COLUMN IF NOT EXISTS "operationKey" varchar',
    );
    await queryRunner.query(
      'ALTER TABLE "wallet_transactions" ADD COLUMN IF NOT EXISTS "operationGroupId" varchar',
    );
    await queryRunner.query(
      'ALTER TABLE "wallet_transactions" ADD COLUMN IF NOT EXISTS "balanceBefore" numeric(14,2)',
    );
    await queryRunner.query(
      'ALTER TABLE "wallet_transactions" ADD COLUMN IF NOT EXISTS "balanceAfter" numeric(14,2)',
    );

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_wallet_transactions_operationKey"
      ON "wallet_transactions" ("operationKey")
      WHERE "operationKey" IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_wallet_transactions_operationGroupId"
      ON "wallet_transactions" ("operationGroupId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_wallet_transactions_operationGroupId"',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS "UQ_wallet_transactions_operationKey"',
    );
    await queryRunner.query(
      'ALTER TABLE "wallet_transactions" DROP COLUMN IF EXISTS "balanceAfter"',
    );
    await queryRunner.query(
      'ALTER TABLE "wallet_transactions" DROP COLUMN IF EXISTS "balanceBefore"',
    );
    await queryRunner.query(
      'ALTER TABLE "wallet_transactions" DROP COLUMN IF EXISTS "operationGroupId"',
    );
    await queryRunner.query(
      'ALTER TABLE "wallet_transactions" DROP COLUMN IF EXISTS "operationKey"',
    );
  }
}
