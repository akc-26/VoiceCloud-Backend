import { Phase08RewardsVipNotificationRecovery1700000000013 } from './1700000000013-Phase08RewardsVipNotificationRecovery';

describe('Phase08 rewards/VIP/notification recovery migration', () => {
  it('adds durable authority/idempotency fields and protects historical notifications', async () => {
    const queries: string[] = [];
    const queryRunner = {
      query: jest.fn().mockImplementation(async (sql: string) => {
        queries.push(sql.replace(/\s+/g, ' ').trim());
      }),
    } as any;
    const migration = new Phase08RewardsVipNotificationRecovery1700000000013();
    await migration.up(queryRunner);
    const joined = queries.join('\n');

    expect(joined).toContain('UQ_reward_audit_logs_operationKey');
    expect(joined).toContain('CREATE TABLE IF NOT EXISTS "lucky_box_openings"');
    expect(joined).toContain('UQ_host_rewards_claimOperationKey');
    expect(joined).toContain('UQ_vip_transactions_provider_reference');
    expect(joined).toContain('UQ_vip_reward_claims_operationKey');
    expect(joined).toContain('UQ_notifications_operationKey');
    expect(joined).toContain('SET "deliveryStatus" = \'SENT\'');
    expect(joined).toContain('ALTER COLUMN "deliveryStatus" SET DEFAULT \'PENDING\'');
    expect(joined).not.toContain('CREATE UNIQUE INDEX IF NOT EXISTS "UQ_vip_reward_claims_period"');
  });

  it('is reversible without modifying prior Phase08 migrations', async () => {
    const queries: string[] = [];
    const queryRunner = {
      query: jest.fn().mockImplementation(async (sql: string) => {
        queries.push(sql.replace(/\s+/g, ' ').trim());
      }),
    } as any;
    const migration = new Phase08RewardsVipNotificationRecovery1700000000013();
    await migration.down(queryRunner);
    const joined = queries.join('\n');
    expect(joined).toContain('DROP TABLE IF EXISTS "lucky_box_openings"');
    expect(joined).toContain('DROP COLUMN IF EXISTS "operationKey"');
  });
});
