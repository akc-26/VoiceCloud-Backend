import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DataSource, EntityManager } from 'typeorm';
import {
  WalletBalanceType,
  WalletCurrency,
  WalletTransactionStatus,
  WalletTransactionType,
} from '../../common/enums';
import { User } from '../users/entities/user.entity';
import { WalletBalance } from './entities/wallet-balance.entity';
import { WalletTransaction } from './entities/wallet-transaction.entity';

export interface WalletLedgerParams {
  userId: string;
  transactionType: WalletTransactionType;
  amount: number;
  balanceType: WalletBalanceType;
  source: string;
  destination: string;
  referenceType?: string;
  referenceId?: string;
  remarks?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  operationKey?: string;
  operationGroupId?: string;
}

export interface WalletMutationResult {
  wallet: WalletBalance;
  transaction: WalletTransaction;
  idempotent: boolean;
}

export interface WalletTransferMutationResult {
  senderWallet: WalletBalance;
  recipientWallet: WalletBalance;
  senderTransaction: WalletTransaction;
  recipientTransaction: WalletTransaction;
  operationGroupId: string;
  idempotent: boolean;
}

export interface DiamondConversionResult {
  wallet: WalletBalance;
  diamondTransaction: WalletTransaction;
  coinTransaction: WalletTransaction;
  operationGroupId: string;
  idempotent: boolean;
}

interface ReplayExpectation {
  userId: string;
  transactionType: WalletTransactionType;
  amount: number;
  balanceType: WalletBalanceType;
  source: string;
  destination: string;
  referenceType?: string;
  referenceId?: string;
  operationGroupId?: string;
}

@Injectable()
export class WalletMutationService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Lock ordering is deterministic for every multi-wallet operation. Sorting by
   * stable User UUID before acquiring PostgreSQL pessimistic locks prevents two
   * callers from locking the same pair in opposite order.
   */
  getDeterministicLockOrder(userIds: string[]): string[] {
    return [...new Set(userIds)].sort((left, right) => left.localeCompare(right));
  }

  async getOrCreateWalletBalance(userId: string): Promise<WalletBalance> {
    return this.dataSource.transaction(async (manager) =>
      this.getLockedWallet(manager, userId),
    );
  }

  async creditInTransaction(
    manager: EntityManager,
    params: WalletLedgerParams,
  ): Promise<WalletMutationResult> {
    this.assertPositiveAmount(params.amount);
    const operationKey = this.resolveOperationKey(
      params.operationKey,
      'credit',
      params.userId,
      params.referenceType,
      params.referenceId,
    );
    const wallet = await this.getLockedWallet(manager, params.userId);
    const replay = await this.findReplay(manager, operationKey, {
      userId: params.userId,
      transactionType: params.transactionType,
      amount: params.amount,
      balanceType: params.balanceType,
      source: params.source,
      destination: params.destination,
      referenceType: params.referenceType,
      referenceId: params.referenceId,
      operationGroupId: params.operationGroupId,
    });
    if (replay) return { wallet, transaction: replay, idempotent: true };

    const balanceBefore = this.readBalance(wallet, params.balanceType);
    this.applyCredit(wallet, params.balanceType, params.amount);
    const balanceAfter = this.readBalance(wallet, params.balanceType);
    await manager.getRepository(WalletBalance).save(wallet);
    const transaction = await this.writeLedger(manager, wallet, {
      ...params,
      operationKey,
      balanceBefore,
      balanceAfter,
    });
    return { wallet, transaction, idempotent: false };
  }

  async debitInTransaction(
    manager: EntityManager,
    params: WalletLedgerParams,
  ): Promise<WalletMutationResult> {
    this.assertPositiveAmount(params.amount);
    const operationKey = this.resolveOperationKey(
      params.operationKey,
      'debit',
      params.userId,
      params.referenceType,
      params.referenceId,
    );
    const wallet = await this.getLockedWallet(manager, params.userId);
    const replay = await this.findReplay(manager, operationKey, {
      userId: params.userId,
      transactionType: params.transactionType,
      amount: params.amount,
      balanceType: params.balanceType,
      source: params.source,
      destination: params.destination,
      referenceType: params.referenceType,
      referenceId: params.referenceId,
      operationGroupId: params.operationGroupId,
    });
    if (replay) return { wallet, transaction: replay, idempotent: true };

    const balanceBefore = this.readBalance(wallet, params.balanceType);
    if (balanceBefore < params.amount) {
      throw new BadRequestException(
        `Insufficient ${params.balanceType} balance for debit`,
      );
    }
    this.applyDebit(wallet, params.balanceType, params.amount);
    const balanceAfter = this.readBalance(wallet, params.balanceType);
    await manager.getRepository(WalletBalance).save(wallet);
    const transaction = await this.writeLedger(manager, wallet, {
      ...params,
      operationKey,
      balanceBefore,
      balanceAfter,
    });
    return { wallet, transaction, idempotent: false };
  }

  async credit(params: WalletLedgerParams): Promise<WalletMutationResult> {
    this.assertPositiveAmount(params.amount);
    const operationKey = this.resolveOperationKey(
      params.operationKey,
      'credit',
      params.userId,
      params.referenceType,
      params.referenceId,
    );

    return this.dataSource.transaction(async (manager) => {
      const wallet = await this.getLockedWallet(manager, params.userId);
      const replay = await this.findReplay(manager, operationKey, {
        userId: params.userId,
        transactionType: params.transactionType,
        amount: params.amount,
        balanceType: params.balanceType,
        source: params.source,
        destination: params.destination,
        referenceType: params.referenceType,
        referenceId: params.referenceId,
        operationGroupId: params.operationGroupId,
      });
      if (replay) {
        return { wallet, transaction: replay, idempotent: true };
      }

      const balanceBefore = this.readBalance(wallet, params.balanceType);
      this.applyCredit(wallet, params.balanceType, params.amount);
      const balanceAfter = this.readBalance(wallet, params.balanceType);

      await manager.getRepository(WalletBalance).save(wallet);
      const transaction = await this.writeLedger(manager, wallet, {
        ...params,
        operationKey,
        balanceBefore,
        balanceAfter,
      });

      return { wallet, transaction, idempotent: false };
    });
  }

  async debit(params: WalletLedgerParams): Promise<WalletMutationResult> {
    this.assertPositiveAmount(params.amount);
    const operationKey = this.resolveOperationKey(
      params.operationKey,
      'debit',
      params.userId,
      params.referenceType,
      params.referenceId,
    );

    return this.dataSource.transaction(async (manager) => {
      const wallet = await this.getLockedWallet(manager, params.userId);
      const replay = await this.findReplay(manager, operationKey, {
        userId: params.userId,
        transactionType: params.transactionType,
        amount: params.amount,
        balanceType: params.balanceType,
        source: params.source,
        destination: params.destination,
        referenceType: params.referenceType,
        referenceId: params.referenceId,
        operationGroupId: params.operationGroupId,
      });
      if (replay) {
        return { wallet, transaction: replay, idempotent: true };
      }

      const balanceBefore = this.readBalance(wallet, params.balanceType);
      if (balanceBefore < params.amount) {
        throw new BadRequestException(
          `Insufficient ${params.balanceType} balance for debit`,
        );
      }

      this.applyDebit(wallet, params.balanceType, params.amount);
      const balanceAfter = this.readBalance(wallet, params.balanceType);

      await manager.getRepository(WalletBalance).save(wallet);
      const transaction = await this.writeLedger(manager, wallet, {
        ...params,
        operationKey,
        balanceBefore,
        balanceAfter,
      });

      return { wallet, transaction, idempotent: false };
    });
  }

  async transfer(params: {
    senderUserId: string;
    recipientUserId: string;
    amount: number;
    balanceType: WalletBalanceType;
    remarks?: string;
    operationKey?: string;
  }): Promise<WalletTransferMutationResult> {
    this.assertPositiveAmount(params.amount);
    if (params.senderUserId === params.recipientUserId) {
      throw new BadRequestException('Cannot transfer funds to the same wallet');
    }

    const operationGroupId =
      params.operationKey?.trim() || `transfer:${randomUUID()}`;
    const senderOperationKey = `${operationGroupId}:debit`;
    const recipientOperationKey = `${operationGroupId}:credit`;

    return this.dataSource.transaction(async (manager) => {
      const lockedWallets = await this.getLockedWallets(manager, [
        params.senderUserId,
        params.recipientUserId,
      ]);
      const senderWallet = lockedWallets.get(params.senderUserId);
      const recipientWallet = lockedWallets.get(params.recipientUserId);

      if (!senderWallet || !recipientWallet) {
        throw new NotFoundException('Transfer wallet could not be resolved');
      }

      const senderReplay = await this.findReplay(manager, senderOperationKey, {
        userId: params.senderUserId,
        transactionType: WalletTransactionType.TRANSFER,
        amount: params.amount,
        balanceType: params.balanceType,
        source: params.senderUserId,
        destination: params.recipientUserId,
        referenceType: 'USER_TRANSFER',
        referenceId: params.recipientUserId,
        operationGroupId,
      });
      const recipientReplay = await this.findReplay(
        manager,
        recipientOperationKey,
        {
          userId: params.recipientUserId,
          transactionType: WalletTransactionType.TRANSFER,
          amount: params.amount,
          balanceType: params.balanceType,
          source: params.senderUserId,
          destination: params.recipientUserId,
          referenceType: 'USER_TRANSFER',
          referenceId: params.senderUserId,
          operationGroupId,
        },
      );

      if (senderReplay || recipientReplay) {
        if (!senderReplay || !recipientReplay) {
          throw new ConflictException(
            'Incomplete transfer ledger group detected for operation key',
          );
        }
        return {
          senderWallet,
          recipientWallet,
          senderTransaction: senderReplay,
          recipientTransaction: recipientReplay,
          operationGroupId,
          idempotent: true,
        };
      }

      const senderBefore = this.readBalance(senderWallet, params.balanceType);
      if (senderBefore < params.amount) {
        throw new BadRequestException(
          `Insufficient ${params.balanceType.toLowerCase()} balance for transfer`,
        );
      }
      const recipientBefore = this.readBalance(
        recipientWallet,
        params.balanceType,
      );

      this.applyDebit(senderWallet, params.balanceType, params.amount);
      this.applyCredit(recipientWallet, params.balanceType, params.amount, false);

      const senderAfter = this.readBalance(senderWallet, params.balanceType);
      const recipientAfter = this.readBalance(
        recipientWallet,
        params.balanceType,
      );

      const walletRepository = manager.getRepository(WalletBalance);
      await walletRepository.save(senderWallet);
      await walletRepository.save(recipientWallet);

      const senderTransaction = await this.writeLedger(manager, senderWallet, {
        userId: params.senderUserId,
        transactionType: WalletTransactionType.TRANSFER,
        amount: params.amount,
        balanceType: params.balanceType,
        source: params.senderUserId,
        destination: params.recipientUserId,
        referenceType: 'USER_TRANSFER',
        referenceId: params.recipientUserId,
        remarks:
          params.remarks ||
          `Transferred ${params.amount} ${params.balanceType} to user ${params.recipientUserId}`,
        operationKey: senderOperationKey,
        operationGroupId,
        balanceBefore: senderBefore,
        balanceAfter: senderAfter,
      });

      const recipientTransaction = await this.writeLedger(
        manager,
        recipientWallet,
        {
          userId: params.recipientUserId,
          transactionType: WalletTransactionType.TRANSFER,
          amount: params.amount,
          balanceType: params.balanceType,
          source: params.senderUserId,
          destination: params.recipientUserId,
          referenceType: 'USER_TRANSFER',
          referenceId: params.senderUserId,
          remarks:
            params.remarks ||
            `Received ${params.amount} ${params.balanceType} from user ${params.senderUserId}`,
          operationKey: recipientOperationKey,
          operationGroupId,
          balanceBefore: recipientBefore,
          balanceAfter: recipientAfter,
        },
      );

      return {
        senderWallet,
        recipientWallet,
        senderTransaction,
        recipientTransaction,
        operationGroupId,
        idempotent: false,
      };
    });
  }

  async convertDiamonds(params: {
    userId: string;
    diamondAmount: number;
    coinsGranted: number;
    operationKey?: string;
  }): Promise<DiamondConversionResult> {
    this.assertPositiveAmount(params.diamondAmount);
    this.assertPositiveAmount(params.coinsGranted);
    const operationGroupId =
      params.operationKey?.trim() || `diamond-conversion:${randomUUID()}`;
    const diamondOperationKey = `${operationGroupId}:diamond-debit`;
    const coinOperationKey = `${operationGroupId}:coin-credit`;

    return this.dataSource.transaction(async (manager) => {
      const wallet = await this.getLockedWallet(manager, params.userId);
      const diamondReplay = await this.findReplay(
        manager,
        diamondOperationKey,
        {
          userId: params.userId,
          transactionType: WalletTransactionType.DIAMOND_CONVERSION,
          amount: params.diamondAmount,
          balanceType: WalletBalanceType.DIAMOND,
          source: params.userId,
          destination: params.userId,
          referenceType: 'DIAMOND_CONVERSION',
          referenceId: operationGroupId,
          operationGroupId,
        },
      );
      const coinReplay = await this.findReplay(manager, coinOperationKey, {
        userId: params.userId,
        transactionType: WalletTransactionType.DIAMOND_CONVERSION,
        amount: params.coinsGranted,
        balanceType: WalletBalanceType.COIN,
        source: params.userId,
        destination: params.userId,
        referenceType: 'DIAMOND_CONVERSION',
        referenceId: operationGroupId,
        operationGroupId,
      });

      if (diamondReplay || coinReplay) {
        if (!diamondReplay || !coinReplay) {
          throw new ConflictException(
            'Incomplete diamond conversion ledger group detected',
          );
        }
        return {
          wallet,
          diamondTransaction: diamondReplay,
          coinTransaction: coinReplay,
          operationGroupId,
          idempotent: true,
        };
      }

      const diamondBefore = wallet.diamondBalance;
      if (diamondBefore < params.diamondAmount) {
        throw new BadRequestException(
          'Insufficient diamond balance for conversion',
        );
      }
      const coinBefore = wallet.coinBalance;

      wallet.diamondBalance -= params.diamondAmount;
      wallet.coinBalance += params.coinsGranted;
      const diamondAfter = wallet.diamondBalance;
      const coinAfter = wallet.coinBalance;

      await manager.getRepository(WalletBalance).save(wallet);

      const diamondTransaction = await this.writeLedger(manager, wallet, {
        userId: params.userId,
        transactionType: WalletTransactionType.DIAMOND_CONVERSION,
        amount: params.diamondAmount,
        balanceType: WalletBalanceType.DIAMOND,
        source: params.userId,
        destination: params.userId,
        referenceType: 'DIAMOND_CONVERSION',
        referenceId: operationGroupId,
        remarks: `Converted ${params.diamondAmount} diamonds`,
        operationKey: diamondOperationKey,
        operationGroupId,
        balanceBefore: diamondBefore,
        balanceAfter: diamondAfter,
        metadata: { coinsGranted: params.coinsGranted, ledgerLeg: 'DEBIT' },
      });

      const coinTransaction = await this.writeLedger(manager, wallet, {
        userId: params.userId,
        transactionType: WalletTransactionType.DIAMOND_CONVERSION,
        amount: params.coinsGranted,
        balanceType: WalletBalanceType.COIN,
        source: params.userId,
        destination: params.userId,
        referenceType: 'DIAMOND_CONVERSION',
        referenceId: operationGroupId,
        remarks: `Granted ${params.coinsGranted} coins from diamond conversion`,
        operationKey: coinOperationKey,
        operationGroupId,
        balanceBefore: coinBefore,
        balanceAfter: coinAfter,
        metadata: { diamondsConverted: params.diamondAmount, ledgerLeg: 'CREDIT' },
      });

      return {
        wallet,
        diamondTransaction,
        coinTransaction,
        operationGroupId,
        idempotent: false,
      };
    });
  }

  async recordCreatorEarnings(params: {
    creatorId: string;
    grossDiamonds: number;
    netDiamonds: number;
    sourceId: string;
    sourceName: string;
  }): Promise<WalletMutationResult> {
    this.assertPositiveAmount(params.grossDiamonds);
    this.assertPositiveAmount(params.netDiamonds);
    const operationKey = `creator-earnings:${params.sourceName}:${params.sourceId}:${params.creatorId}`;

    return this.dataSource.transaction(async (manager) => {
      const wallet = await this.getLockedWallet(manager, params.creatorId);
      const replay = await this.findReplay(manager, operationKey, {
        userId: params.creatorId,
        transactionType: WalletTransactionType.CREATOR_EARNINGS,
        amount: params.netDiamonds,
        balanceType: WalletBalanceType.DIAMOND,
        source: params.sourceName,
        destination: params.creatorId,
        referenceType: params.sourceName,
        referenceId: params.sourceId,
      });
      if (replay) {
        return { wallet, transaction: replay, idempotent: true };
      }

      const diamondBefore = wallet.diamondBalance;
      const withdrawableBefore = wallet.withdrawableBalance || 0;
      wallet.diamondBalance += params.netDiamonds;
      wallet.totalDiamondsEarned += params.netDiamonds;
      wallet.withdrawableBalance = withdrawableBefore + params.netDiamonds;
      const diamondAfter = wallet.diamondBalance;

      await manager.getRepository(WalletBalance).save(wallet);
      const transaction = await this.writeLedger(manager, wallet, {
        userId: params.creatorId,
        transactionType: WalletTransactionType.CREATOR_EARNINGS,
        amount: params.netDiamonds,
        balanceType: WalletBalanceType.DIAMOND,
        source: params.sourceName,
        destination: params.creatorId,
        referenceType: params.sourceName,
        referenceId: params.sourceId,
        remarks: `Creator earned ${params.netDiamonds} net diamonds from ${params.sourceName} (Gross: ${params.grossDiamonds})`,
        operationKey,
        balanceBefore: diamondBefore,
        balanceAfter: diamondAfter,
        metadata: {
          grossDiamonds: params.grossDiamonds,
          netDiamonds: params.netDiamonds,
          withdrawableBefore,
          withdrawableAfter: wallet.withdrawableBalance,
        },
      });

      return { wallet, transaction, idempotent: false };
    });
  }


  private assertPositiveAmount(amount: number): void {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Financial mutation amount must be positive');
    }
  }

  private async getLockedWallets(
    manager: EntityManager,
    userIds: string[],
  ): Promise<Map<string, WalletBalance>> {
    const wallets = new Map<string, WalletBalance>();
    for (const userId of this.getDeterministicLockOrder(userIds)) {
      wallets.set(userId, await this.getLockedWallet(manager, userId));
    }
    return wallets;
  }

  private async getLockedWallet(
    manager: EntityManager,
    userId: string,
  ): Promise<WalletBalance> {
    const userRepository = manager.getRepository(User);
    const user = await userRepository.findOne({
      where: { id: userId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!user) {
      throw new NotFoundException(`User '${userId}' not found`);
    }

    const walletRepository = manager.getRepository(WalletBalance);
    let wallet = await walletRepository.findOne({
      where: { userId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!wallet) {
      wallet = walletRepository.create({
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
      });
      wallet = await walletRepository.save(wallet);
    }

    return wallet;
  }

  private async findReplay(
    manager: EntityManager,
    operationKey: string,
    expected: ReplayExpectation,
  ): Promise<WalletTransaction | null> {
    const transaction = await manager.getRepository(WalletTransaction).findOne({
      where: { operationKey },
    });
    if (!transaction) {
      return null;
    }

    const matches =
      transaction.userId === expected.userId &&
      transaction.transactionType === expected.transactionType &&
      Number(transaction.amount) === Number(expected.amount) &&
      transaction.balanceType === expected.balanceType &&
      transaction.source === expected.source &&
      transaction.destination === expected.destination &&
      (transaction.referenceType ?? undefined) === expected.referenceType &&
      (transaction.referenceId ?? undefined) === expected.referenceId &&
      (transaction.operationGroupId ?? undefined) === expected.operationGroupId &&
      transaction.status === WalletTransactionStatus.COMPLETED;

    if (!matches) {
      throw new ConflictException(
        'Operation key is already bound to a different financial operation',
      );
    }

    return transaction;
  }

  private resolveOperationKey(
    supplied: string | undefined,
    prefix: string,
    userId: string,
    referenceType?: string,
    referenceId?: string,
  ): string {
    if (supplied?.trim()) {
      return supplied.trim();
    }
    if (referenceId?.trim()) {
      return `${prefix}:${userId}:${referenceType || 'REFERENCE'}:${referenceId}`;
    }
    return `${prefix}:${userId}:${randomUUID()}`;
  }

  private readBalance(wallet: WalletBalance, balanceType: WalletBalanceType) {
    switch (balanceType) {
      case WalletBalanceType.COIN:
        return wallet.coinBalance;
      case WalletBalanceType.DIAMOND:
        return wallet.diamondBalance;
      case WalletBalanceType.BONUS:
        return wallet.bonusBalance || 0;
      case WalletBalanceType.PROMOTIONAL:
        return wallet.promotionalBalance || 0;
      case WalletBalanceType.FROZEN:
        return wallet.frozenBalance || 0;
      case WalletBalanceType.WITHDRAWABLE:
        return wallet.withdrawableBalance || 0;
    }
  }

  private applyCredit(
    wallet: WalletBalance,
    balanceType: WalletBalanceType,
    amount: number,
    trackLifetime = true,
  ) {
    switch (balanceType) {
      case WalletBalanceType.COIN:
        wallet.coinBalance += amount;
        break;
      case WalletBalanceType.DIAMOND:
        wallet.diamondBalance += amount;
        if (trackLifetime) wallet.totalDiamondsEarned += amount;
        break;
      case WalletBalanceType.BONUS:
        wallet.bonusBalance = (wallet.bonusBalance || 0) + amount;
        break;
      case WalletBalanceType.PROMOTIONAL:
        wallet.promotionalBalance = (wallet.promotionalBalance || 0) + amount;
        break;
      case WalletBalanceType.FROZEN:
        wallet.frozenBalance = (wallet.frozenBalance || 0) + amount;
        break;
      case WalletBalanceType.WITHDRAWABLE:
        wallet.withdrawableBalance = (wallet.withdrawableBalance || 0) + amount;
        break;
    }
  }

  private applyDebit(
    wallet: WalletBalance,
    balanceType: WalletBalanceType,
    amount: number,
  ) {
    switch (balanceType) {
      case WalletBalanceType.COIN:
        wallet.coinBalance -= amount;
        wallet.totalCoinsSpent += amount;
        break;
      case WalletBalanceType.DIAMOND:
        wallet.diamondBalance -= amount;
        break;
      case WalletBalanceType.BONUS:
        wallet.bonusBalance -= amount;
        break;
      case WalletBalanceType.PROMOTIONAL:
        wallet.promotionalBalance -= amount;
        break;
      case WalletBalanceType.FROZEN:
        wallet.frozenBalance -= amount;
        break;
      case WalletBalanceType.WITHDRAWABLE:
        wallet.withdrawableBalance -= amount;
        wallet.totalDiamondsWithdrawn += amount;
        break;
    }
  }

  private currencyFor(balanceType: WalletBalanceType): WalletCurrency {
    return balanceType === WalletBalanceType.DIAMOND ||
      balanceType === WalletBalanceType.WITHDRAWABLE
      ? WalletCurrency.DIAMOND
      : WalletCurrency.COIN;
  }

  private async writeLedger(
    manager: EntityManager,
    wallet: WalletBalance,
    params: WalletLedgerParams & {
      operationKey: string;
      balanceBefore: number;
      balanceAfter: number;
    },
  ): Promise<WalletTransaction> {
    const repository = manager.getRepository(WalletTransaction);
    const transaction = repository.create({
      walletId: wallet.id,
      userId: params.userId,
      transactionType: params.transactionType,
      amount: params.amount,
      currency: this.currencyFor(params.balanceType),
      balanceType: params.balanceType,
      source: params.source,
      destination: params.destination,
      referenceType: params.referenceType,
      referenceId: params.referenceId,
      status: WalletTransactionStatus.COMPLETED,
      remarks: params.remarks,
      description: params.description || params.remarks,
      metadata: params.metadata,
      operationKey: params.operationKey,
      operationGroupId: params.operationGroupId,
      balanceBefore: params.balanceBefore,
      balanceAfter: params.balanceAfter,
    });
    return repository.save(transaction);
  }
}
