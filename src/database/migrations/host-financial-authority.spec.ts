import { Phase08HostFinancialAuthority1700000000012 } from './1700000000012-Phase08HostFinancialAuthority';

describe('Phase08HostFinancialAuthority1700000000012', () => {
  it('adds Host authority anchors and durable settlement reservations', async () => {
    const queries: string[] = [];
    const runner = {
      query: jest.fn(async (sql: string) => queries.push(sql)),
    } as any;
    const migration = new Phase08HostFinancialAuthority1700000000012();
    await migration.up(runner);
    const sql = queries.join('\n');

    expect(sql).toContain('"authorityInitializedAt"');
    expect(sql).toContain('"authorityBaselineTransactionId"');
    expect(sql).toContain('"host_settlement_requests"');
    expect(sql).toContain('"settledAmount"');
    expect(sql).toContain('UQ_host_settlement_requests_reserveOperationKey');
    expect(sql).toContain('CHK_host_settlement_requests_settled_range');
  });

  it('is reversible', async () => {
    const queries: string[] = [];
    const runner = {
      query: jest.fn(async (sql: string) => queries.push(sql)),
    } as any;
    const migration = new Phase08HostFinancialAuthority1700000000012();
    await migration.down(runner);
    const sql = queries.join('\n');

    expect(sql).toContain('DROP TABLE IF EXISTS "host_settlement_requests"');
    expect(sql).toContain('DROP COLUMN IF EXISTS "authorityInitializedAt"');
  });
});
