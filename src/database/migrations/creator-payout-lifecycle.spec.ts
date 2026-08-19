import { Phase08CreatorPayoutLifecycle1700000000011 } from './1700000000011-Phase08CreatorPayoutLifecycle';

describe('Phase08CreatorPayoutLifecycle1700000000011', () => {
  it('adds durable reservation, settlement and release evidence', async () => {
    const queries: string[] = [];
    const runner = { query: jest.fn(async (sql: string) => queries.push(sql)) } as any;
    const migration = new Phase08CreatorPayoutLifecycle1700000000011();
    await migration.up(runner);
    const sql = queries.join('\n');
    expect(sql).toContain('"reservedAt"');
    expect(sql).toContain('"settledAt"');
    expect(sql).toContain('"releasedAt"');
    expect(sql).toContain('"reservationTransactionId"');
    expect(sql).toContain('"settlementTransactionId"');
    expect(sql).toContain('"releaseTransactionId"');
    expect(sql).toContain('UQ_creator_payout_requests_reserveOperationKey');
  });

  it('is reversible', async () => {
    const queries: string[] = [];
    const runner = { query: jest.fn(async (sql: string) => queries.push(sql)) } as any;
    const migration = new Phase08CreatorPayoutLifecycle1700000000011();
    await migration.down(runner);
    expect(queries.join('\n')).toContain('DROP COLUMN IF EXISTS "reservedAt"');
  });
});
