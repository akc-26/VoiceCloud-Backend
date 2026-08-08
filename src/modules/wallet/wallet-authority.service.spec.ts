import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  WalletBalanceType,
  WalletTransactionType,
} from '../../common/enums';
import { User } from '../users/entities/user.entity';
import { WalletBalance } from './entities/wallet-balance.entity';
import { WalletTransaction } from './entities/wallet-transaction.entity';
import { WalletMutationService } from './wallet-mutation.service';

function createHarness(options?: {
  userExists?: boolean;
  wallet?: Partial<WalletBalance> | null;
  replay?: Partial<WalletTransaction> | null;
}) {
  const userExists = options?.userExists ?? true;
  const walletState =
    options?.wallet === null
      ? null
      : ({
          id: 'wallet-1',
          userId: 'user-1',
          coinBalance: 100,
          diamondBalance: 50,
          bonusBalance: 0,
          promotionalBalance: 0,
          frozenBalance: 0,
          withdrawableBalance: 20,
          totalCoinsPurchased: 0,
          totalCoinsSpent: 0,
          totalDiamondsEarned: 0,
          totalDiamondsWithdrawn: 0,
          ...(options?.wallet || {}),
        } as WalletBalance);

  const ledger: WalletTransaction[] = [];
  if (options?.replay) ledger.push(options.replay as WalletTransaction);

  const userRepository = {
    findOne: jest.fn().mockResolvedValue(userExists ? { id: 'user-1' } : null),
    create: jest.fn(),
    save: jest.fn(),
  };

  const walletRepository = {
    findOne: jest.fn().mockImplementation(async ({ where }: any) => {
      if (walletState && where.userId === walletState.userId) return walletState;
      return null;
    }),
    create: jest.fn().mockImplementation((value) => ({ id: 'wallet-new', ...value })),
    save: jest.fn().mockImplementation(async (value) => value),
  };

  const transactionRepository = {
    findOne: jest.fn().mockImplementation(async ({ where }: any) => {
      return ledger.find((item) => item.operationKey === where.operationKey) || null;
    }),
    create: jest.fn().mockImplementation((value) => ({
      id: `tx-${ledger.length + 1}`,
      createdAt: new Date(),
      ...value,
    })),
    save: jest.fn().mockImplementation(async (value) => {
      ledger.push(value);
      return value;
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

  const dataSource = {
    transaction: jest.fn().mockImplementation(async (callback) => callback(manager)),
  } as unknown as DataSource;

  return {
    service: new WalletMutationService(dataSource),
    userRepository,
    walletRepository,
    transactionRepository,
    ledger,
    walletState,
    manager,
  };
}

describe('WalletMutationService authority', () => {
  it('returns an existing wallet without creating a replacement', async () => {
    const harness = createHarness();
    const result = await harness.service.getOrCreateWalletBalance('user-1');

    expect(result).toBe(harness.walletState);
    expect(harness.walletRepository.create).not.toHaveBeenCalled();
  });

  it('rejects an unknown User and never fabricates an identity', async () => {
    const harness = createHarness({ userExists: false, wallet: null });

    await expect(
      harness.service.getOrCreateWalletBalance('user-1'),
    ).rejects.toThrow(NotFoundException);
    expect(harness.userRepository.create).not.toHaveBeenCalled();
    expect(harness.userRepository.save).not.toHaveBeenCalled();
    expect(harness.walletRepository.create).not.toHaveBeenCalled();
  });

  it('creates an existing User wallet with every financial field at zero', async () => {
    const harness = createHarness({ wallet: null });
    const wallet = await harness.service.getOrCreateWalletBalance('user-1');

    expect(harness.walletRepository.create).toHaveBeenCalledWith({
      userId: 'user-1',
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
    });
    expect(wallet.coinBalance).toBe(0);
    expect(wallet.withdrawableBalance).toBe(0);
  });

  it('credits balance and writes before/after ledger evidence in one transaction', async () => {
    const harness = createHarness();
    const result = await harness.service.credit({
      userId: 'user-1',
      transactionType: WalletTransactionType.CREDIT,
      amount: 25,
      balanceType: WalletBalanceType.COIN,
      source: 'SYSTEM',
      destination: 'user-1',
      operationKey: 'credit-1',
    });

    expect(result.wallet.coinBalance).toBe(125);
    expect(result.transaction.balanceBefore).toBe(100);
    expect(result.transaction.balanceAfter).toBe(125);
    expect(result.transaction.operationKey).toBe('credit-1');
    expect(harness.walletRepository.save).toHaveBeenCalledTimes(1);
    expect(harness.transactionRepository.save).toHaveBeenCalledTimes(1);
  });

  it('rejects an insufficient debit before any persistence', async () => {
    const harness = createHarness({ wallet: { coinBalance: 10 } });

    await expect(
      harness.service.debit({
        userId: 'user-1',
        transactionType: WalletTransactionType.DEBIT,
        amount: 11,
        balanceType: WalletBalanceType.COIN,
        source: 'user-1',
        destination: 'SYSTEM',
        operationKey: 'debit-too-large',
      }),
    ).rejects.toThrow(BadRequestException);

    expect(harness.walletRepository.save).not.toHaveBeenCalled();
    expect(harness.transactionRepository.save).not.toHaveBeenCalled();
    expect(harness.walletState?.coinBalance).toBe(10);
  });

  it('replays the same operation key without applying a second mutation', async () => {
    const harness = createHarness();
    const params = {
      userId: 'user-1',
      transactionType: WalletTransactionType.DEBIT,
      amount: 10,
      balanceType: WalletBalanceType.COIN,
      source: 'user-1',
      destination: 'SYSTEM',
      operationKey: 'same-debit',
    };

    const first = await harness.service.debit(params);
    const second = await harness.service.debit(params);

    expect(first.idempotent).toBe(false);
    expect(second.idempotent).toBe(true);
    expect(harness.walletState?.coinBalance).toBe(90);
    expect(harness.transactionRepository.save).toHaveBeenCalledTimes(1);
  });

  it('rejects reuse of an operation key for a different financial intent', async () => {
    const harness = createHarness();

    await harness.service.credit({
      userId: 'user-1',
      transactionType: WalletTransactionType.CREDIT,
      amount: 10,
      balanceType: WalletBalanceType.COIN,
      source: 'SYSTEM',
      destination: 'user-1',
      operationKey: 'shared-operation-key',
    });

    await expect(
      harness.service.debit({
        userId: 'user-1',
        transactionType: WalletTransactionType.DEBIT,
        amount: 10,
        balanceType: WalletBalanceType.COIN,
        source: 'user-1',
        destination: 'SYSTEM',
        operationKey: 'shared-operation-key',
      }),
    ).rejects.toThrow('different financial operation');

    expect(harness.walletState?.coinBalance).toBe(110);
    expect(harness.transactionRepository.save).toHaveBeenCalledTimes(1);
  });

  it('prevents sequential competing spends from producing a negative balance', async () => {
    const harness = createHarness({ wallet: { coinBalance: 10 } });
    await harness.service.debit({
      userId: 'user-1',
      transactionType: WalletTransactionType.DEBIT,
      amount: 7,
      balanceType: WalletBalanceType.COIN,
      source: 'user-1',
      destination: 'SYSTEM',
      operationKey: 'spend-a',
    });

    await expect(
      harness.service.debit({
        userId: 'user-1',
        transactionType: WalletTransactionType.DEBIT,
        amount: 7,
        balanceType: WalletBalanceType.COIN,
        source: 'user-1',
        destination: 'SYSTEM',
        operationKey: 'spend-b',
      }),
    ).rejects.toThrow(BadRequestException);
    expect(harness.walletState?.coinBalance).toBe(3);
  });

  it('records diamond conversion as two atomic ledger legs', async () => {
    const harness = createHarness({ wallet: { diamondBalance: 20, coinBalance: 5 } });
    const result = await harness.service.convertDiamonds({
      userId: 'user-1',
      diamondAmount: 2,
      coinsGranted: 20,
      operationKey: 'conversion-1',
    });

    expect(result.wallet.diamondBalance).toBe(18);
    expect(result.wallet.coinBalance).toBe(25);
    expect(result.diamondTransaction.balanceBefore).toBe(20);
    expect(result.diamondTransaction.balanceAfter).toBe(18);
    expect(result.coinTransaction.balanceBefore).toBe(5);
    expect(result.coinTransaction.balanceAfter).toBe(25);
    expect(harness.transactionRepository.save).toHaveBeenCalledTimes(2);
  });

  it('records creator earnings atomically with withdrawable reconciliation metadata', async () => {
    const harness = createHarness({ wallet: { diamondBalance: 10, withdrawableBalance: 4 } });
    const result = await harness.service.recordCreatorEarnings({
      creatorId: 'user-1',
      grossDiamonds: 100,
      netDiamonds: 80,
      sourceId: 'gift-1',
      sourceName: 'GIFT',
    });

    expect(result.wallet.diamondBalance).toBe(90);
    expect(result.wallet.withdrawableBalance).toBe(84);
    expect(result.transaction.operationKey).toBe(
      'creator-earnings:GIFT:gift-1:user-1',
    );
    expect(result.transaction.metadata).toMatchObject({
      withdrawableBefore: 4,
      withdrawableAfter: 84,
    });
  });
});
