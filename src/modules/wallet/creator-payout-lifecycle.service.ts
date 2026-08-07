import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DataSource, EntityManager } from 'typeorm';
import {
  PayoutMethod,
  PayoutStatus,
  WalletBalanceType,
  WalletCurrency,
  WalletTransactionStatus,
  WalletTransactionType,
} from '../../common/enums';
import { CreatorPayoutRequest } from '../users/entities/creator-payout-request.entity';
import { User } from '../users/entities/user.entity';
import { WalletBalance } from './entities/wallet-balance.entity';
import { WalletTransaction } from './entities/wallet-transaction.entity';

export interface CreateCreatorPayoutReservation {
  diamondAmount: number;
  payoutMethod: PayoutMethod;
  accountDetails?: Record<string, unknown>;
  operationKey?: string;
}

export interface PayoutLifecycleResult {
  payout: CreatorPayoutRequest;
  transaction?: WalletTransaction;
  idempotent: boolean;
}

@Injectable()
export class CreatorPayoutLifecycleService {
  constructor(private readonly dataSource: DataSource) {}

  async reserve(
    creatorId: string,
    input: CreateCreatorPayoutReservation,
  ): Promise<CreatorPayoutRequest> {
    if (!Number.isInteger(input.diamondAmount) || input.diamondAmount < 100) {
      throw new BadRequestException('Minimum payout threshold is 100 diamonds');
    }

    return this.dataSource.transaction(async (manager) => {
      await this.lockCreatorPayoutScope(manager, creatorId);
      const payoutRepository = manager.getRepository(CreatorPayoutRequest);
      const clientOperationKey = input.operationKey?.trim();
      const replayOperationKey = clientOperationKey
        ? `creator-payout-reserve:${creatorId}:${clientOperationKey}`
        : undefined;
      if (replayOperationKey) {
        await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
          replayOperationKey,
        ]);
        const replay = await payoutRepository.findOne({
          where: { reserveOperationKey: replayOperationKey },
          lock: { mode: 'pessimistic_write' },
        });
        if (replay) {
          if (
            replay.creatorId !== creatorId ||
            replay.diamondAmount !== input.diamondAmount ||
            replay.payoutMethod !== input.payoutMethod
          ) {
            throw new ConflictException(
              'Payout operation key is already bound to a different request',
            );
          }
          return replay;
        }
      }
      const existing = await payoutRepository.findOne({
        where: [
          { creatorId, status: PayoutStatus.PENDING },
          { creatorId, status: PayoutStatus.APPROVED },
        ],
        lock: { mode: 'pessimistic_write' },
      });
      if (existing) {
        throw new ConflictException(
          'You already have a payout request with reserved funds',
        );
      }

      const wallet = await this.getLockedWallet(manager, creatorId);
      const availableDiamonds = Math.min(
        Number(wallet.diamondBalance) || 0,
        Number(wallet.withdrawableBalance) || 0,
      );
      if (availableDiamonds < input.diamondAmount) {
        throw new BadRequestException(
          `Insufficient withdrawable diamond balance. You have ${availableDiamonds} diamonds available.`,
        );
      }

      const payoutId = randomUUID();
      const operationGroupId = `creator-payout:${payoutId}`;
      const reserveOperationKey =
        replayOperationKey || `${operationGroupId}:reserve`;
      const diamondBefore = wallet.diamondBalance;
      const withdrawableBefore = wallet.withdrawableBalance || 0;
      const frozenBefore = wallet.frozenBalance || 0;

      wallet.diamondBalance -= input.diamondAmount;
      wallet.withdrawableBalance = withdrawableBefore - input.diamondAmount;
      wallet.frozenBalance = frozenBefore + input.diamondAmount;
      await manager.getRepository(WalletBalance).save(wallet);

      const payoutAmount = Number((input.diamondAmount * 0.005).toFixed(2));
      const payout = payoutRepository.create({
        id: payoutId,
        creatorId,
        diamondAmount: input.diamondAmount,
        payoutAmount,
        payoutMethod: input.payoutMethod,
        accountDetails: input.accountDetails || {},
        status: PayoutStatus.PENDING,
        reservedAt: new Date(),
        operationGroupId,
        reserveOperationKey,
      });
      await payoutRepository.save(payout);

      const transaction = await this.writeLedger(manager, wallet, {
        userId: creatorId,
        amount: input.diamondAmount,
        balanceType: WalletBalanceType.DIAMOND,
        source: creatorId,
        destination: 'PAYOUT_RESERVE',
        referenceId: payout.id,
        operationKey: reserveOperationKey,
        operationGroupId,
        balanceBefore: diamondBefore,
        balanceAfter: wallet.diamondBalance,
        remarks: `Reserved ${input.diamondAmount} diamonds for creator payout`,
        metadata: {
          lifecycleAction: 'RESERVE',
          withdrawableBefore,
          withdrawableAfter: wallet.withdrawableBalance,
          frozenBefore,
          frozenAfter: wallet.frozenBalance,
        },
      });
      payout.reservationTransactionId = transaction.id;
      return payoutRepository.save(payout);
    });
  }

  async approve(
    payoutRequestId: string,
    reviewedBy: string,
  ): Promise<PayoutLifecycleResult> {
    return this.dataSource.transaction(async (manager) => {
      const payout = await this.getLockedPayout(manager, payoutRequestId);
      if (payout.status === PayoutStatus.APPROVED) {
        return { payout, idempotent: true };
      }
      if (payout.status !== PayoutStatus.PENDING) {
        throw new ConflictException(
          `Payout ${payout.id} cannot be approved from ${payout.status}`,
        );
      }
      payout.status = PayoutStatus.APPROVED;
      payout.reviewedBy = reviewedBy;
      payout.reviewedAt = new Date();
      payout.rejectionReason = null;
      return {
        payout: await manager.getRepository(CreatorPayoutRequest).save(payout),
        idempotent: false,
      };
    });
  }

  async reject(
    payoutRequestId: string,
    reviewedBy: string,
    reason?: string,
  ): Promise<PayoutLifecycleResult> {
    return this.dataSource.transaction(async (manager) => {
      const payout = await this.getLockedPayout(manager, payoutRequestId);
      if (payout.status === PayoutStatus.REJECTED) {
        return { payout, idempotent: true };
      }
      if (
        payout.status !== PayoutStatus.PENDING &&
        payout.status !== PayoutStatus.APPROVED
      ) {
        throw new ConflictException(
          `Payout ${payout.id} cannot be rejected from ${payout.status}`,
        );
      }

      const wallet = await this.getLockedWallet(manager, payout.creatorId);
      if (wallet.frozenBalance < payout.diamondAmount) {
        throw new ConflictException(
          'Payout reservation is not fully present in frozen balance',
        );
      }

      const releaseOperationKey = `${payout.operationGroupId}:release`;
      const replay = await this.findOperation(manager, releaseOperationKey);
      if (replay) {
        payout.status = PayoutStatus.REJECTED;
        payout.releaseTransactionId = replay.id;
        payout.releasedAt = payout.releasedAt || new Date();
        payout.reviewedBy = reviewedBy;
        payout.reviewedAt = payout.reviewedAt || new Date();
        payout.rejectionReason = reason || payout.rejectionReason || null;
        return {
          payout: await manager
            .getRepository(CreatorPayoutRequest)
            .save(payout),
          transaction: replay,
          idempotent: true,
        };
      }

      const frozenBefore = wallet.frozenBalance;
      const diamondBefore = wallet.diamondBalance;
      const withdrawableBefore = wallet.withdrawableBalance || 0;
      wallet.frozenBalance -= payout.diamondAmount;
      wallet.diamondBalance += payout.diamondAmount;
      wallet.withdrawableBalance = withdrawableBefore + payout.diamondAmount;
      await manager.getRepository(WalletBalance).save(wallet);

      const transaction = await this.writeLedger(manager, wallet, {
        userId: payout.creatorId,
        amount: payout.diamondAmount,
        balanceType: WalletBalanceType.FROZEN,
        source: 'PAYOUT_RESERVE',
        destination: payout.creatorId,
        referenceId: payout.id,
        operationKey: releaseOperationKey,
        operationGroupId: payout.operationGroupId,
        balanceBefore: frozenBefore,
        balanceAfter: wallet.frozenBalance,
        remarks: `Released ${payout.diamondAmount} reserved diamonds after payout rejection`,
        metadata: {
          lifecycleAction: 'RELEASE',
          diamondBefore,
          diamondAfter: wallet.diamondBalance,
          withdrawableBefore,
          withdrawableAfter: wallet.withdrawableBalance,
        },
      });

      payout.status = PayoutStatus.REJECTED;
      payout.reviewedBy = reviewedBy;
      payout.reviewedAt = new Date();
      payout.rejectionReason = reason || null;
      payout.releasedAt = new Date();
      payout.releaseTransactionId = transaction.id;
      return {
        payout: await manager.getRepository(CreatorPayoutRequest).save(payout),
        transaction,
        idempotent: false,
      };
    });
  }

  async settle(
    payoutRequestId: string,
    reviewedBy?: string,
  ): Promise<PayoutLifecycleResult> {
    return this.dataSource.transaction(async (manager) => {
      const payout = await this.getLockedPayout(manager, payoutRequestId);
      if (payout.status === PayoutStatus.PROCESSED) {
        const replay = payout.settlementTransactionId
          ? await manager.getRepository(WalletTransaction).findOne({
              where: { id: payout.settlementTransactionId },
            })
          : null;
        return { payout, transaction: replay || undefined, idempotent: true };
      }
      if (payout.status !== PayoutStatus.APPROVED) {
        throw new ConflictException(
          `Payout ${payout.id} must be APPROVED before settlement`,
        );
      }

      const wallet = await this.getLockedWallet(manager, payout.creatorId);
      if (wallet.frozenBalance < payout.diamondAmount) {
        throw new ConflictException(
          'Payout reservation is not fully present in frozen balance',
        );
      }

      const settleOperationKey = `${payout.operationGroupId}:settle`;
      const replay = await this.findOperation(manager, settleOperationKey);
      if (replay) {
        payout.status = PayoutStatus.PROCESSED;
        payout.settlementTransactionId = replay.id;
        payout.settledAt = payout.settledAt || new Date();
        if (reviewedBy) payout.reviewedBy = reviewedBy;
        return {
          payout: await manager
            .getRepository(CreatorPayoutRequest)
            .save(payout),
          transaction: replay,
          idempotent: true,
        };
      }

      const frozenBefore = wallet.frozenBalance;
      const totalWithdrawnBefore = wallet.totalDiamondsWithdrawn || 0;
      wallet.frozenBalance -= payout.diamondAmount;
      wallet.totalDiamondsWithdrawn =
        totalWithdrawnBefore + payout.diamondAmount;
      await manager.getRepository(WalletBalance).save(wallet);

      const transaction = await this.writeLedger(manager, wallet, {
        userId: payout.creatorId,
        amount: payout.diamondAmount,
        balanceType: WalletBalanceType.FROZEN,
        source: payout.creatorId,
        destination: 'PAYOUT_SYSTEM',
        referenceId: payout.id,
        operationKey: settleOperationKey,
        operationGroupId: payout.operationGroupId,
        balanceBefore: frozenBefore,
        balanceAfter: wallet.frozenBalance,
        remarks: `Settled creator payout ${payout.id} for ${payout.diamondAmount} diamonds`,
        metadata: {
          lifecycleAction: 'SETTLE',
          payoutAmount: payout.payoutAmount,
          payoutMethod: payout.payoutMethod,
          totalDiamondsWithdrawnBefore: totalWithdrawnBefore,
          totalDiamondsWithdrawnAfter: wallet.totalDiamondsWithdrawn,
        },
      });

      payout.status = PayoutStatus.PROCESSED;
      payout.settledAt = new Date();
      payout.settlementTransactionId = transaction.id;
      if (reviewedBy) {
        payout.reviewedBy = reviewedBy;
        payout.reviewedAt = payout.reviewedAt || new Date();
      }
      return {
        payout: await manager.getRepository(CreatorPayoutRequest).save(payout),
        transaction,
        idempotent: false,
      };
    });
  }

  async list(status?: PayoutStatus): Promise<CreatorPayoutRequest[]> {
    return this.dataSource.getRepository(CreatorPayoutRequest).find({
      where: status ? { status } : {},
      order: { createdAt: 'DESC' },
    });
  }

  private async lockCreatorPayoutScope(
    manager: EntityManager,
    creatorId: string,
  ): Promise<void> {
    await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
      `creator-payout:${creatorId}`,
    ]);
  }

  private async getLockedPayout(
    manager: EntityManager,
    payoutRequestId: string,
  ): Promise<CreatorPayoutRequest> {
    await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
      `creator-payout-request:${payoutRequestId}`,
    ]);
    const payout = await manager.getRepository(CreatorPayoutRequest).findOne({
      where: { id: payoutRequestId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!payout) {
      throw new NotFoundException(
        `Payout request with ID '${payoutRequestId}' not found`,
      );
    }
    return payout;
  }

  private async getLockedWallet(
    manager: EntityManager,
    userId: string,
  ): Promise<WalletBalance> {
    const user = await manager.getRepository(User).findOne({
      where: { id: userId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!user) throw new NotFoundException(`User '${userId}' not found`);

    const repository = manager.getRepository(WalletBalance);
    let wallet = await repository.findOne({
      where: { userId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!wallet) {
      wallet = await repository.save(
        repository.create({
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
        }),
      );
    }
    return wallet;
  }

  private async findOperation(
    manager: EntityManager,
    operationKey: string,
  ): Promise<WalletTransaction | null> {
    return manager.getRepository(WalletTransaction).findOne({
      where: { operationKey },
    });
  }

  private async writeLedger(
    manager: EntityManager,
    wallet: WalletBalance,
    input: {
      userId: string;
      amount: number;
      balanceType: WalletBalanceType;
      source: string;
      destination: string;
      referenceId: string;
      operationKey: string;
      operationGroupId: string;
      balanceBefore: number;
      balanceAfter: number;
      remarks: string;
      metadata: Record<string, unknown>;
    },
  ): Promise<WalletTransaction> {
    return manager.getRepository(WalletTransaction).save(
      manager.getRepository(WalletTransaction).create({
        walletId: wallet.id,
        userId: input.userId,
        transactionType: WalletTransactionType.CREATOR_PAYOUT,
        amount: input.amount,
        currency: WalletCurrency.DIAMOND,
        balanceType: input.balanceType,
        source: input.source,
        destination: input.destination,
        referenceType: 'CREATOR_PAYOUT_REQUEST',
        referenceId: input.referenceId,
        status: WalletTransactionStatus.COMPLETED,
        remarks: input.remarks,
        description: input.remarks,
        metadata: input.metadata,
        operationKey: input.operationKey,
        operationGroupId: input.operationGroupId,
        balanceBefore: input.balanceBefore,
        balanceAfter: input.balanceAfter,
      }),
    );
  }
}
