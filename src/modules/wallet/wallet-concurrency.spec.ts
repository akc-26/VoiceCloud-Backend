import { DataSource } from 'typeorm';
import { WalletBalanceType } from '../../common/enums';
import { User } from '../users/entities/user.entity';
import { WalletBalance } from './entities/wallet-balance.entity';
import { WalletTransaction } from './entities/wallet-transaction.entity';
import { WalletMutationService } from './wallet-mutation.service';

function createTransferHarness(failLedgerSaveAt?: number) {
  const committed = {
    wallets: new Map<string, WalletBalance>([
      [
        'user-z',
        {
          id: 'wallet-z',
          userId: 'user-z',
          coinBalance: 100,
          diamondBalance: 0,
          bonusBalance: 0,
          promotionalBalance: 0,
          frozenBalance: 0,
          withdrawableBalance: 0,
          totalCoinsPurchased: 0,
          totalCoinsSpent: 0,
          totalDiamondsEarned: 0,
          totalDiamondsWithdrawn: 0,
        } as WalletBalance,
      ],
      [
        'user-a',
        {
          id: 'wallet-a',
          userId: 'user-a',
          coinBalance: 5,
          diamondBalance: 0,
          bonusBalance: 0,
          promotionalBalance: 0,
          frozenBalance: 0,
          withdrawableBalance: 0,
          totalCoinsPurchased: 0,
          totalCoinsSpent: 0,
          totalDiamondsEarned: 0,
          totalDiamondsWithdrawn: 0,
        } as WalletBalance,
      ],
    ]),
    ledger: [] as WalletTransaction[],
  };
  const lockOrder: string[] = [];

  const dataSource = {
    transaction: jest.fn().mockImplementation(async (callback) => {
      const localWallets = new Map(
        [...committed.wallets].map(([id, wallet]) => [id, { ...wallet }]),
      );
      const localLedger = committed.ledger.map((entry) => ({ ...entry }));
      let saveCount = 0;

      const userRepository = {
        findOne: jest.fn().mockImplementation(async ({ where, lock }: any) => {
          if (lock?.mode === 'pessimistic_write') lockOrder.push(where.id);
          return localWallets.has(where.id) ? { id: where.id } : null;
        }),
      };
      const walletRepository = {
        findOne: jest.fn().mockImplementation(async ({ where }: any) => {
          return localWallets.get(where.userId) || null;
        }),
        create: jest.fn().mockImplementation((value) => value),
        save: jest.fn().mockImplementation(async (wallet: WalletBalance) => {
          localWallets.set(wallet.userId, wallet);
          return wallet;
        }),
      };
      const transactionRepository = {
        findOne: jest.fn().mockImplementation(async ({ where }: any) => {
          return (
            localLedger.find((entry) => entry.operationKey === where.operationKey) ||
            null
          );
        }),
        create: jest.fn().mockImplementation((value) => ({
          id: `tx-${localLedger.length + 1}`,
          createdAt: new Date(),
          ...value,
        })),
        save: jest.fn().mockImplementation(async (entry: WalletTransaction) => {
          saveCount += 1;
          if (failLedgerSaveAt === saveCount) {
            throw new Error('simulated ledger persistence failure');
          }
          localLedger.push(entry);
          return entry;
        }),
      };
      const manager = {
        getRepository: jest.fn().mockImplementation((entity) => {
          if (entity === User) return userRepository;
          if (entity === WalletBalance) return walletRepository;
          if (entity === WalletTransaction) return transactionRepository;
          throw new Error('Unexpected repository');
        }),
      };

      const result = await callback(manager);
      committed.wallets = localWallets;
      committed.ledger = localLedger;
      return result;
    }),
  } as unknown as DataSource;

  return {
    service: new WalletMutationService(dataSource),
    committed,
    lockOrder,
  };
}

describe('WalletMutationService concurrency rules', () => {
  it('uses deterministic stable User ID ordering for multi-wallet locks', async () => {
    const harness = createTransferHarness();
    expect(
      harness.service.getDeterministicLockOrder(['user-z', 'user-a', 'user-m']),
    ).toEqual(['user-a', 'user-m', 'user-z']);

    await harness.service.transfer({
      senderUserId: 'user-z',
      recipientUserId: 'user-a',
      amount: 10,
      balanceType: WalletBalanceType.COIN,
      operationKey: 'transfer-ordered',
    });
    expect(harness.lockOrder).toEqual(['user-a', 'user-z']);
  });

  it('deduplicates repeated User IDs before lock acquisition', () => {
    const service = new WalletMutationService({} as DataSource);
    expect(
      service.getDeterministicLockOrder(['user-b', 'user-a', 'user-b']),
    ).toEqual(['user-a', 'user-b']);
  });

  it('commits sender debit, recipient credit, and exactly two ledger legs together', async () => {
    const harness = createTransferHarness();
    const result = await harness.service.transfer({
      senderUserId: 'user-z',
      recipientUserId: 'user-a',
      amount: 25,
      balanceType: WalletBalanceType.COIN,
      operationKey: 'transfer-atomic',
    });

    expect(harness.committed.wallets.get('user-z')?.coinBalance).toBe(75);
    expect(harness.committed.wallets.get('user-a')?.coinBalance).toBe(30);
    expect(harness.committed.ledger).toHaveLength(2);
    expect(result.senderTransaction.operationKey).toBe('transfer-atomic:debit');
    expect(result.recipientTransaction.operationKey).toBe(
      'transfer-atomic:credit',
    );
    expect(result.senderTransaction.balanceBefore).toBe(100);
    expect(result.senderTransaction.balanceAfter).toBe(75);
    expect(result.recipientTransaction.balanceBefore).toBe(5);
    expect(result.recipientTransaction.balanceAfter).toBe(30);
  });

  it('rolls back both wallets when a transfer ledger leg fails', async () => {
    const harness = createTransferHarness(2);

    await expect(
      harness.service.transfer({
        senderUserId: 'user-z',
        recipientUserId: 'user-a',
        amount: 25,
        balanceType: WalletBalanceType.COIN,
        operationKey: 'transfer-rollback',
      }),
    ).rejects.toThrow('simulated ledger persistence failure');

    expect(harness.committed.wallets.get('user-z')?.coinBalance).toBe(100);
    expect(harness.committed.wallets.get('user-a')?.coinBalance).toBe(5);
    expect(harness.committed.ledger).toHaveLength(0);
  });
});
