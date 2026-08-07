import { CreatorPayoutLifecycleService } from './creator-payout-lifecycle.service';
import { CreatorPayoutRequest } from '../users/entities/creator-payout-request.entity';
import { User } from '../users/entities/user.entity';
import { WalletBalance } from './entities/wallet-balance.entity';
import { WalletTransaction } from './entities/wallet-transaction.entity';
import { PayoutMethod, PayoutStatus } from '../../common/enums';

describe('CreatorPayoutLifecycleService', () => {
  const creatorId = '11111111-1111-4111-8111-111111111111';
  const adminId = '22222222-2222-4222-8222-222222222222';

  const createHarness = () => {
    const user = { id: creatorId } as User;
    const wallet = {
      id: '33333333-3333-4333-8333-333333333333',
      userId: creatorId,
      coinBalance: 0,
      diamondBalance: 5000,
      bonusBalance: 0,
      promotionalBalance: 0,
      frozenBalance: 0,
      withdrawableBalance: 5000,
      totalCoinsPurchased: 0,
      totalCoinsSpent: 0,
      totalDiamondsEarned: 5000,
      totalDiamondsWithdrawn: 0,
    } as WalletBalance;
    const payouts: CreatorPayoutRequest[] = [];
    const transactions: WalletTransaction[] = [];

    const userRepo = {
      findOne: jest.fn(async () => user),
    };
    const walletRepo = {
      findOne: jest.fn(async () => wallet),
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => Object.assign(wallet, value)),
    };
    const payoutRepo = {
      findOne: jest.fn(async (options: any) => {
        const where = options.where;
        if (Array.isArray(where)) {
          return (
            payouts.find((payout) =>
              where.some(
                (candidate) =>
                  candidate.creatorId === payout.creatorId &&
                  candidate.status === payout.status,
              ),
            ) || null
          );
        }
        if (where.reserveOperationKey) {
          return (
            payouts.find(
              (payout) =>
                payout.reserveOperationKey === where.reserveOperationKey,
            ) || null
          );
        }
        if (where.creatorId && where.diamondAmount && where.status) {
          return (
            payouts.find(
              (payout) =>
                payout.creatorId === where.creatorId &&
                payout.diamondAmount === where.diamondAmount &&
                payout.status === where.status,
            ) || null
          );
        }
        return payouts.find((payout) => payout.id === where.id) || null;
      }),
      create: jest.fn((value) => ({ ...value }) as CreatorPayoutRequest),
      save: jest.fn(async (value: CreatorPayoutRequest) => {
        const index = payouts.findIndex((payout) => payout.id === value.id);
        if (index >= 0) payouts[index] = value;
        else payouts.push(value);
        return value;
      }),
      find: jest.fn(async () => payouts),
    };
    const transactionRepo = {
      findOne: jest.fn(async (options: any) => {
        const where = options.where;
        return (
          transactions.find(
            (transaction) =>
              (where.operationKey && transaction.operationKey === where.operationKey) ||
              (where.id && transaction.id === where.id),
          ) || null
        );
      }),
      create: jest.fn((value) => ({ ...value }) as WalletTransaction),
      save: jest.fn(async (value: WalletTransaction) => {
        if (!value.id) {
          value.id = `44444444-4444-4444-8444-${String(transactions.length + 1).padStart(12, '0')}`;
        }
        transactions.push(value);
        return value;
      }),
    };
    const manager = {
      query: jest.fn(async () => []),
      getRepository: jest.fn((entity) => {
        if (entity === User) return userRepo;
        if (entity === WalletBalance) return walletRepo;
        if (entity === CreatorPayoutRequest) return payoutRepo;
        if (entity === WalletTransaction) return transactionRepo;
        throw new Error('Unexpected repository');
      }),
    };
    const dataSource = {
      transaction: jest.fn(async (callback) => callback(manager)),
      getRepository: jest.fn((entity) => {
        if (entity === CreatorPayoutRequest) return payoutRepo;
        throw new Error('Unexpected repository');
      }),
    } as any;

    return {
      service: new CreatorPayoutLifecycleService(dataSource),
      wallet,
      payouts,
      transactions,
    };
  };

  it('reserves withdrawable diamonds atomically at request time', async () => {
    const harness = createHarness();
    const payout = await harness.service.reserve(creatorId, {
      diamondAmount: 1000,
      payoutMethod: PayoutMethod.BANK_TRANSFER,
    });

    expect(payout.status).toBe(PayoutStatus.PENDING);
    expect(harness.wallet.diamondBalance).toBe(4000);
    expect(harness.wallet.withdrawableBalance).toBe(4000);
    expect(harness.wallet.frozenBalance).toBe(1000);
    expect(harness.transactions).toHaveLength(1);
    expect(payout.reservationTransactionId).toBe(harness.transactions[0].id);
  });

  it('replays the same client operation key without reserving twice', async () => {
    const harness = createHarness();
    const input = {
      diamondAmount: 1000,
      payoutMethod: PayoutMethod.BANK_TRANSFER,
      operationKey: 'creator-request-1',
    };
    const first = await harness.service.reserve(creatorId, input);
    const second = await harness.service.reserve(creatorId, input);

    expect(second.id).toBe(first.id);
    expect(harness.wallet.diamondBalance).toBe(4000);
    expect(harness.wallet.frozenBalance).toBe(1000);
    expect(harness.transactions).toHaveLength(1);
  });

  it('approves and settles reserved funds exactly once', async () => {
    const harness = createHarness();
    const payout = await harness.service.reserve(creatorId, {
      diamondAmount: 1000,
      payoutMethod: PayoutMethod.BANK_TRANSFER,
    });
    await harness.service.approve(payout.id, adminId);
    const first = await harness.service.settle(payout.id, adminId);
    const second = await harness.service.settle(payout.id, adminId);

    expect(first.payout.status).toBe(PayoutStatus.PROCESSED);
    expect(first.idempotent).toBe(false);
    expect(second.idempotent).toBe(true);
    expect(harness.wallet.frozenBalance).toBe(0);
    expect(harness.wallet.totalDiamondsWithdrawn).toBe(1000);
    expect(harness.transactions).toHaveLength(2);
  });

  it('releases reserved funds once when Admin rejects a payout', async () => {
    const harness = createHarness();
    const payout = await harness.service.reserve(creatorId, {
      diamondAmount: 1000,
      payoutMethod: PayoutMethod.BANK_TRANSFER,
    });
    const first = await harness.service.reject(payout.id, adminId, 'review');
    const second = await harness.service.reject(payout.id, adminId, 'review');

    expect(first.payout.status).toBe(PayoutStatus.REJECTED);
    expect(second.idempotent).toBe(true);
    expect(harness.wallet.diamondBalance).toBe(5000);
    expect(harness.wallet.withdrawableBalance).toBe(5000);
    expect(harness.wallet.frozenBalance).toBe(0);
    expect(harness.wallet.totalDiamondsWithdrawn).toBe(0);
    expect(harness.transactions).toHaveLength(2);
  });

  it('does not allow settlement before Admin approval', async () => {
    const harness = createHarness();
    const payout = await harness.service.reserve(creatorId, {
      diamondAmount: 1000,
      payoutMethod: PayoutMethod.BANK_TRANSFER,
    });

    await expect(harness.service.settle(payout.id, adminId)).rejects.toThrow(
      'must be APPROVED before settlement',
    );
    expect(harness.wallet.frozenBalance).toBe(1000);
  });
  it('legacy settlement delegates only to an approved reserved payout', async () => {
    const harness = createHarness();
    const payout = await harness.service.reserve(creatorId, {
      diamondAmount: 1000,
      payoutMethod: PayoutMethod.BANK_TRANSFER,
    });

    await expect(
      harness.service.settleLegacy(creatorId, 1000, adminId),
    ).rejects.toThrow('requires an approved reserved payout request');

    await harness.service.approve(payout.id, adminId);
    const result = await harness.service.settleLegacy(creatorId, 1000, adminId);

    expect(result.payout.status).toBe(PayoutStatus.PROCESSED);
    expect(harness.wallet.frozenBalance).toBe(0);
    expect(harness.wallet.totalDiamondsWithdrawn).toBe(1000);
  });
});
