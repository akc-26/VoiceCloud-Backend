import { HostFinancialAuthorityService } from './host-financial-authority.service';
import { HostProfile } from './entities/host-profile.entity';
import { HostEarnings } from './entities/host-earnings.entity';
import {
  HostSettlementRequest,
  HostSettlementRequestStatus,
} from './entities/host-settlement-request.entity';
import { HostAuditNote } from './entities/host-audit-note.entity';
import { User } from '../users/entities/user.entity';
import { WalletBalance } from '../wallet/entities/wallet-balance.entity';
import { WalletTransaction } from '../wallet/entities/wallet-transaction.entity';
import { WalletTransactionType } from '../../common/enums';

const hostId = '11111111-1111-4111-8111-111111111111';
const userId = '22222222-2222-4222-8222-222222222222';
const adminId = '33333333-3333-4333-8333-333333333333';

describe('HostFinancialAuthorityService', () => {
  const createHarness = (initialLifetime = 1000) => {
    let idCounter = 1;
    const host = { id: hostId, userId } as HostProfile;
    const user = { id: userId } as User;
    const wallet = {
      id: '44444444-4444-4444-8444-444444444444',
      userId,
      coinBalance: 0,
      diamondBalance: 0,
      bonusBalance: 0,
      promotionalBalance: 0,
      frozenBalance: 0,
      withdrawableBalance: 0,
      totalCoinsPurchased: 0,
      totalCoinsSpent: 0,
      totalDiamondsEarned: 0,
      totalDiamondsWithdrawn: 0,
    } as WalletBalance;
    let earnings = {
      id: '55555555-5555-4555-8555-555555555555',
      hostProfileId: hostId,
      userId,
      dailyEarnings: initialLifetime,
      weeklyEarnings: initialLifetime,
      monthlyEarnings: initialLifetime,
      lifetimeEarnings: initialLifetime,
      pendingSettlements: 0,
      completedSettlements: 0,
      giftIncome: initialLifetime,
      vipBonusIncome: 0,
      roomBonusIncome: 0,
      authorityInitializedAt: null,
      authorityBaselineTransactionId: null,
    } as HostEarnings;
    let requests: HostSettlementRequest[] = [];
    let transactions: WalletTransaction[] = [];
    let audits: HostAuditNote[] = [];

    const cloneState = () => ({
      earnings: { ...earnings },
      requests: requests.map((value) => ({ ...value })),
      transactions: transactions.map((value) => ({ ...value })),
      audits: audits.map((value) => ({ ...value })),
      idCounter,
    });
    const restoreState = (snapshot: ReturnType<typeof cloneState>) => {
      earnings = snapshot.earnings;
      requests = snapshot.requests;
      transactions = snapshot.transactions;
      audits = snapshot.audits;
      idCounter = snapshot.idCounter;
    };

    const matchWhere = (value: any, where: any) =>
      Object.entries(where || {}).every(([key, expected]) => value[key] === expected);

    const hostRepo = {
      findOne: jest.fn(async ({ where }: any) => {
        if (where.id && where.id === host.id) return host;
        if (where.userId && where.userId === host.userId) return host;
        return null;
      }),
    };
    const userRepo = { findOne: jest.fn(async () => user) };
    const walletRepo = {
      findOne: jest.fn(async () => wallet),
      create: jest.fn((value) => ({ ...value })),
      save: jest.fn(async (value) => Object.assign(wallet, value)),
    };
    const earningsRepo = {
      findOne: jest.fn(async () => earnings),
      find: jest.fn(async () => [earnings]),
      create: jest.fn((value) => ({ ...value } as HostEarnings)),
      save: jest.fn(async (value: HostEarnings) => {
        earnings = { ...value };
        return earnings;
      }),
    };
    const requestRepo = {
      findOne: jest.fn(async ({ where }: any) =>
        requests.find((value) => matchWhere(value, where)) || null,
      ),
      find: jest.fn(async ({ where, order }: any = {}) => {
        let result = requests.filter((value) => matchWhere(value, where));
        if (order?.createdAt === 'ASC') {
          result = result.sort(
            (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
          );
        }
        return result;
      }),
      create: jest.fn((value) => ({ ...value } as HostSettlementRequest)),
      save: jest.fn(async (value: HostSettlementRequest) => {
        if (!value.id) {
          value.id = `66666666-6666-4666-8666-${String(idCounter++).padStart(12, '0')}`;
          value.createdAt = new Date();
          value.updatedAt = new Date();
        }
        const index = requests.findIndex((request) => request.id === value.id);
        if (index >= 0) requests[index] = value;
        else requests.push(value);
        return value;
      }),
    };
    const transactionRepo = {
      findOne: jest.fn(async ({ where }: any) =>
        transactions.find((value) => matchWhere(value, where)) || null,
      ),
      find: jest.fn(async ({ where }: any = {}) =>
        transactions.filter((value) => matchWhere(value, where)),
      ),
      create: jest.fn((value) => ({ ...value } as WalletTransaction)),
      save: jest.fn(async (value: WalletTransaction) => {
        if (!value.id) {
          value.id = `77777777-7777-4777-8777-${String(idCounter++).padStart(12, '0')}`;
        }
        transactions.push(value);
        return value;
      }),
    };
    const auditRepo = {
      create: jest.fn((value) => ({ ...value } as HostAuditNote)),
      save: jest.fn(async (value: HostAuditNote) => {
        audits.push(value);
        return value;
      }),
    };
    const manager = {
      query: jest.fn(async () => []),
      getRepository: jest.fn((entity) => {
        if (entity === HostProfile) return hostRepo;
        if (entity === HostEarnings) return earningsRepo;
        if (entity === HostSettlementRequest) return requestRepo;
        if (entity === HostAuditNote) return auditRepo;
        if (entity === User) return userRepo;
        if (entity === WalletBalance) return walletRepo;
        if (entity === WalletTransaction) return transactionRepo;
        throw new Error(`Unexpected repository ${entity?.name}`);
      }),
    };
    const dataSource = {
      getRepository: jest.fn((entity) => {
        if (entity === HostEarnings) return earningsRepo;
        throw new Error(`Unexpected DataSource repository ${entity?.name}`);
      }),
      transaction: jest.fn(async (callback) => {
        const snapshot = cloneState();
        try {
          return await callback(manager);
        } catch (error) {
          restoreState(snapshot);
          throw error;
        }
      }),
    } as any;

    return {
      service: new HostFinancialAuthorityService(dataSource),
      get earnings() {
        return earnings;
      },
      get requests() {
        return requests;
      },
      get transactions() {
        return transactions;
      },
      get audits() {
        return audits;
      },
      manager,
    };
  };

  it('anchors historical earnings and creates a durable settlement reservation', async () => {
    const harness = createHarness(1000);
    const result = await harness.service.requestSettlement(userId, 250, 'req-1');

    expect(result.lifetimeEarnings).toBe(1000);
    expect(result.pendingSettlements).toBe(250);
    expect(harness.requests).toHaveLength(1);
    expect(harness.requests[0].status).toBe(HostSettlementRequestStatus.PENDING);
    expect(
      harness.transactions.filter(
        (transaction) =>
          transaction.transactionType === WalletTransactionType.HOST_EARNINGS,
      ),
    ).toHaveLength(1);
    expect(
      harness.transactions.filter(
        (transaction) =>
          transaction.transactionType ===
          WalletTransactionType.HOST_SETTLEMENT_RESERVE,
      ),
    ).toHaveLength(1);
  });

  it('replays a settlement request operation key without reserving twice', async () => {
    const harness = createHarness(1000);
    await harness.service.requestSettlement(userId, 250, 'req-1');
    await harness.service.requestSettlement(userId, 250, 'req-1');

    expect(harness.earnings.pendingSettlements).toBe(250);
    expect(harness.requests).toHaveLength(1);
  });

  it('rejects reservation greater than ledger-backed unsettled earnings', async () => {
    const harness = createHarness(1000);
    await harness.service.requestSettlement(userId, 800, 'req-1');

    await expect(
      harness.service.requestSettlement(userId, 300, 'req-2'),
    ).rejects.toThrow('Insufficient unsettled earnings balance');
    expect(harness.earnings.pendingSettlements).toBe(800);
    expect(harness.requests).toHaveLength(1);
  });

  it('completes only reserved value and supports exact partial settlement', async () => {
    const harness = createHarness(1000);
    await harness.service.requestSettlement(userId, 400, 'req-1');
    const result = await harness.service.completeSettlement(
      hostId,
      150,
      adminId,
      'complete-1',
    );

    expect(result.pendingSettlements).toBe(250);
    expect(result.completedSettlements).toBe(150);
    expect(harness.requests[0].settledAmount).toBe(150);
    expect(harness.requests[0].status).toBe(HostSettlementRequestStatus.PENDING);
    expect(harness.audits).toHaveLength(1);
  });

  it('rejects over-settlement without changing authoritative state', async () => {
    const harness = createHarness(1000);
    await harness.service.requestSettlement(userId, 200, 'req-1');
    const beforeTransactions = harness.transactions.length;

    await expect(
      harness.service.completeSettlement(hostId, 250, adminId, 'complete-1'),
    ).rejects.toThrow('exceeds reserved pending balance');
    expect(harness.earnings.pendingSettlements).toBe(200);
    expect(harness.earnings.completedSettlements).toBe(0);
    expect(harness.transactions).toHaveLength(beforeTransactions);
  });

  it('replays the same completion operation key without settling twice', async () => {
    const harness = createHarness(1000);
    await harness.service.requestSettlement(userId, 200, 'req-1');
    await harness.service.completeSettlement(hostId, 200, adminId, 'complete-1');
    await harness.service.completeSettlement(hostId, 200, adminId, 'complete-1');

    expect(harness.earnings.pendingSettlements).toBe(0);
    expect(harness.earnings.completedSettlements).toBe(200);
    expect(
      harness.transactions.filter(
        (transaction) =>
          transaction.transactionType === WalletTransactionType.HOST_SETTLEMENT,
      ),
    ).toHaveLength(1);
  });

  it('serializes Host financial mutations with the PostgreSQL advisory lock', async () => {
    const harness = createHarness(1000);
    await harness.service.requestSettlement(userId, 100, 'req-lock');

    expect(harness.manager.query).toHaveBeenCalledWith(
      'SELECT pg_advisory_xact_lock(hashtext($1))',
      [`host-financial:${hostId}`],
    );
  });

  it('rejects corrupted over-settled reservation evidence instead of clamping it', async () => {
    const harness = createHarness(1000);
    await harness.service.requestSettlement(userId, 200, 'req-1');
    harness.requests[0].settledAmount = 250;

    await expect(harness.service.getEarnings(userId)).rejects.toThrow(
      'reservation contains invalid settled amount',
    );
  });

  it('preserves the Admin self-settlement prohibition', async () => {
    const harness = createHarness(1000);
    await harness.service.requestSettlement(userId, 200, 'req-1');

    await expect(
      harness.service.completeSettlement(hostId, 200, userId, 'complete-1'),
    ).rejects.toThrow('Administrators cannot complete settlement payout');
  });

  it('reconciles the Admin earnings overview through financial authority', async () => {
    const harness = createHarness(1000);
    await harness.service.requestSettlement(userId, 200, 'req-1');

    const overview = await harness.service.getEarningsOverviewAdmin();

    expect(overview.totalHostsWithEarnings).toBe(1);
    expect(overview.totalLifetimeEarnings).toBe(1000);
    expect(overview.totalPendingSettlements).toBe(200);
    expect(overview.totalCompletedSettlements).toBe(0);
  });

  it('records new Host income and immutable financial evidence atomically', async () => {
    const harness = createHarness(1000);
    const result = await harness.service.recordIncome(userId, {
      giftIncome: 50,
      vipBonusIncome: 0,
      roomBonusIncome: 0,
    });

    expect(result.lifetimeEarnings).toBe(1050);
    expect(result.giftIncome).toBe(1050);
    expect(
      harness.transactions.filter(
        (transaction) =>
          transaction.transactionType === WalletTransactionType.HOST_EARNINGS,
      ),
    ).toHaveLength(2);
  });
});
