import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase08AuthoritativeGiftSettlement1700000000010 implements MigrationInterface {
  name = 'Phase08AuthoritativeGiftSettlement1700000000010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "gift_transactions" ADD COLUMN IF NOT EXISTS "operationKey" varchar',
    );
    await queryRunner.query(
      'ALTER TABLE "gift_transactions" ADD COLUMN IF NOT EXISTS "operationGroupId" varchar',
    );
    await queryRunner.query(
      'ALTER TABLE "gift_transactions" ADD COLUMN IF NOT EXISTS "senderWalletTransactionId" uuid',
    );
    await queryRunner.query(
      'ALTER TABLE "gift_transactions" ADD COLUMN IF NOT EXISTS "receiverWalletTransactionId" uuid',
    );
    await queryRunner.query(
      'ALTER TABLE "gift_transactions" ADD COLUMN IF NOT EXISTS "settledAt" timestamp',
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS "UQ_gift_transactions_operationKey" ON "gift_transactions" ("operationKey") WHERE "operationKey" IS NOT NULL',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_gift_transactions_operationGroupId" ON "gift_transactions" ("operationGroupId")',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_gift_transactions_operationGroupId"',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS "UQ_gift_transactions_operationKey"',
    );
    await queryRunner.query(
      'ALTER TABLE "gift_transactions" DROP COLUMN IF EXISTS "settledAt"',
    );
    await queryRunner.query(
      'ALTER TABLE "gift_transactions" DROP COLUMN IF EXISTS "receiverWalletTransactionId"',
    );
    await queryRunner.query(
      'ALTER TABLE "gift_transactions" DROP COLUMN IF EXISTS "senderWalletTransactionId"',
    );
    await queryRunner.query(
      'ALTER TABLE "gift_transactions" DROP COLUMN IF EXISTS "operationGroupId"',
    );
    await queryRunner.query(
      'ALTER TABLE "gift_transactions" DROP COLUMN IF EXISTS "operationKey"',
    );
  }
}
