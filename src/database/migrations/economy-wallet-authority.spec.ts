import { QueryRunner } from 'typeorm';
import { Phase08EconomyWalletAuthority1700000000009 } from './1700000000009-Phase08EconomyWalletAuthority';

describe('Phase08EconomyWalletAuthority migration', () => {
  const migration = new Phase08EconomyWalletAuthority1700000000009();

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

  it('adds nullable operation and before/after audit fields plus indexes', async () => {
    const { queries, queryRunner } = runner();
    await migration.up(queryRunner);
    const sql = queries.join('\n');

    expect(sql).toContain('ADD COLUMN IF NOT EXISTS "operationKey" varchar');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS "operationGroupId" varchar');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS "balanceBefore" numeric(14,2)');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS "balanceAfter" numeric(14,2)');
    expect(sql).toContain('CREATE UNIQUE INDEX IF NOT EXISTS "UQ_wallet_transactions_operationKey"');
    expect(sql).toContain('WHERE "operationKey" IS NOT NULL');
    expect(sql).toContain('CREATE INDEX IF NOT EXISTS "IDX_wallet_transactions_operationGroupId"');
  });

  it('reverses every index and column introduced by up()', async () => {
    const { queries, queryRunner } = runner();
    await migration.down(queryRunner);
    const sql = queries.join('\n');

    expect(sql).toContain('DROP INDEX IF EXISTS "IDX_wallet_transactions_operationGroupId"');
    expect(sql).toContain('DROP INDEX IF EXISTS "UQ_wallet_transactions_operationKey"');
    expect(sql).toContain('DROP COLUMN IF EXISTS "balanceAfter"');
    expect(sql).toContain('DROP COLUMN IF EXISTS "balanceBefore"');
    expect(sql).toContain('DROP COLUMN IF EXISTS "operationGroupId"');
    expect(sql).toContain('DROP COLUMN IF EXISTS "operationKey"');
  });
});
