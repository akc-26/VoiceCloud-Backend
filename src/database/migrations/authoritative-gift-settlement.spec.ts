import { QueryRunner } from 'typeorm';
import { Phase08AuthoritativeGiftSettlement1700000000010 } from './1700000000010-Phase08AuthoritativeGiftSettlement';

describe('Phase08AuthoritativeGiftSettlement migration', () => {
  const migration = new Phase08AuthoritativeGiftSettlement1700000000010();

  function runner() {
    const queries: string[] = [];
    return {
      queries,
      queryRunner: {
        query: jest.fn().mockImplementation(async (sql: string) => {
          queries.push(sql.replace(/\s+/g, ' ').trim());
        }),
      } as unknown as QueryRunner,
    };
  }

  it('adds persistent gift idempotency and wallet-ledger linkage fields', async () => {
    const { queries, queryRunner } = runner();
    await migration.up(queryRunner);
    const sql = queries.join('\n');

    expect(sql).toContain('ADD COLUMN IF NOT EXISTS "operationKey" varchar');
    expect(sql).toContain(
      'ADD COLUMN IF NOT EXISTS "operationGroupId" varchar',
    );
    expect(sql).toContain(
      'ADD COLUMN IF NOT EXISTS "senderWalletTransactionId" uuid',
    );
    expect(sql).toContain(
      'ADD COLUMN IF NOT EXISTS "receiverWalletTransactionId" uuid',
    );
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS "settledAt" timestamp');
    expect(sql).toContain(
      'CREATE UNIQUE INDEX IF NOT EXISTS "UQ_gift_transactions_operationKey"',
    );
    expect(sql).toContain('WHERE "operationKey" IS NOT NULL');
    expect(sql).toContain(
      'CREATE INDEX IF NOT EXISTS "IDX_gift_transactions_operationGroupId"',
    );
  });

  it('reverses every gift-settlement index and column', async () => {
    const { queries, queryRunner } = runner();
    await migration.down(queryRunner);
    const sql = queries.join('\n');

    expect(sql).toContain(
      'DROP INDEX IF EXISTS "IDX_gift_transactions_operationGroupId"',
    );
    expect(sql).toContain(
      'DROP INDEX IF EXISTS "UQ_gift_transactions_operationKey"',
    );
    expect(sql).toContain('DROP COLUMN IF EXISTS "settledAt"');
    expect(sql).toContain(
      'DROP COLUMN IF EXISTS "receiverWalletTransactionId"',
    );
    expect(sql).toContain('DROP COLUMN IF EXISTS "senderWalletTransactionId"');
    expect(sql).toContain('DROP COLUMN IF EXISTS "operationGroupId"');
    expect(sql).toContain('DROP COLUMN IF EXISTS "operationKey"');
  });
});
