import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DataSource, EntityManager } from 'typeorm';
import {
  WalletCurrency,
  WalletTransactionStatus,
  WalletTransactionType,
} from '../../common/enums';
import { User } from '../users/entities/user.entity';
import { WalletBalance } from '../wallet/entities/wallet-balance.entity';
import { WalletTransaction } from '../wallet/entities/wallet-transaction.entity';
import { HostAuditNote } from './entities/host-audit-note.entity';
import { HostEarnings } from './entities/host-earnings.entity';
import { HostProfile } from './entities/host-profile.entity';
import {
  HostSettlementRequest,
  HostSettlementRequestStatus,
} from './entities/host-settlement-request.entity';

interface HostIncomeComponents {
  giftIncome: number;
  vipBonusIncome: number;
  roomBonusIncome: number;
}

@Injectable()
export class HostFinancialAuthorityService {
  constructor(private readonly dataSource: DataSource) {}

  async getEarnings(userId: string): Promise<HostEarnings> {
    return this.dataSource.transaction(async (manager) => {
      const host = await this.getLockedHostByUserId(manager, userId);
      await this.lockHostFinancialScope(manager, host.id);
      const earnings = await this.getOrCreateLockedEarnings(manager, host);
      await this.ensureAuthorityInitialized(manager, host, earnings);
      return this.reconcileAggregates(manager, host, earnings);
    });
  }

  async getEarningsOverviewAdmin(): Promise<{
    totalHostsWithEarnings: number;
    totalLifetimeEarnings: number;
    totalPendingSettlements: number;
    totalCompletedSettlements: number;
    earningsList: HostEarnings[];
  }> {
    const rows = await this.dataSource.getRepository(HostEarnings).find();
    const earningsList: HostEarnings[] = [];
    for (const row of rows) {
      earningsList.push(await this.getEarnings(row.userId));
    }

    return {
      totalHostsWithEarnings: earningsList.length,
      totalLifetimeEarnings: this.roundMoney(
        earningsList.reduce(
          (sum, earnings) => sum + Number(earnings.lifetimeEarnings),
          0,
        ),
      ),
      totalPendingSettlements: this.roundMoney(
        earningsList.reduce(
          (sum, earnings) => sum + Number(earnings.pendingSettlements),
          0,
        ),
      ),
      totalCompletedSettlements: this.roundMoney(
        earningsList.reduce(
          (sum, earnings) => sum + Number(earnings.completedSettlements),
          0,
        ),
      ),
      earningsList,
    };
  }

  async recordIncome(
    userId: string,
    components: HostIncomeComponents,
  ): Promise<HostEarnings> {
    const values = [
      components.giftIncome,
      components.vipBonusIncome,
      components.roomBonusIncome,
    ];
    if (
      values.some(
        (value) =>
          !Number.isFinite(value) ||
          value < 0 ||
          Math.abs(value - Number(value.toFixed(2))) > 1e-9,
      )
    ) {
      throw new BadRequestException(
        'Host income values must be non-negative with at most two decimal places',
      );
    }

    const totalNew = values.reduce((sum, value) => sum + value, 0);
    if (totalNew === 0) {
      return this.dataSource.transaction(async (manager) => {
        const host = await this.getLockedHostByUserId(manager, userId);
        await this.lockHostFinancialScope(manager, host.id);
        const earnings = await this.getOrCreateLockedEarnings(manager, host);
        await this.ensureAuthorityInitialized(manager, host, earnings);
        return this.reconcileAggregates(manager, host, earnings);
      });
    }

    return this.dataSource.transaction(async (manager) => {
      const host = await this.getLockedHostByUserId(manager, userId);
      await this.lockHostFinancialScope(manager, host.id);
      const earnings = await this.getOrCreateLockedEarnings(manager, host);
      await this.ensureAuthorityInitialized(manager, host, earnings);
      await this.reconcileAggregates(manager, host, earnings);

      const lifetimeBefore = Number(earnings.lifetimeEarnings);
      const operationGroupId = `host-income:${randomUUID()}`;
      const operationKey = `${operationGroupId}:credit`;

      earnings.giftIncome = Number(earnings.giftIncome) + components.giftIncome;
      earnings.vipBonusIncome =
        Number(earnings.vipBonusIncome) + components.vipBonusIncome;
      earnings.roomBonusIncome =
        Number(earnings.roomBonusIncome) + components.roomBonusIncome;
      earnings.dailyEarnings = Number(earnings.dailyEarnings) + totalNew;
      earnings.weeklyEarnings = Number(earnings.weeklyEarnings) + totalNew;
      earnings.monthlyEarnings = Number(earnings.monthlyEarnings) + totalNew;
      earnings.lifetimeEarnings = lifetimeBefore + totalNew;

      await manager.getRepository(HostEarnings).save(earnings);
      const wallet = await this.getOrCreateWallet(manager, host.userId);
      await this.writeLedger(manager, wallet, {
        transactionType: WalletTransactionType.HOST_EARNINGS,
        amount: totalNew,
        balanceType: 'HOST_EARNINGS',
        source: 'HOST_INCOME',
        destination: host.userId,
        referenceType: 'HOST_EARNINGS',
        referenceId: host.id,
        operationKey,
        operationGroupId,
        balanceBefore: lifetimeBefore,
        balanceAfter: earnings.lifetimeEarnings,
        remarks: `Recorded Host earnings of $${totalNew.toFixed(2)}`,
        metadata: {
          hostProfileId: host.id,
          giftIncome: components.giftIncome,
          vipBonusIncome: components.vipBonusIncome,
          roomBonusIncome: components.roomBonusIncome,
        },
      });

      return this.reconcileAggregates(manager, host, earnings);
    });
  }

  async requestSettlement(
    userId: string,
    amount: number,
    operationKey?: string,
  ): Promise<HostEarnings> {
    this.validateSettlementAmount(amount);

    return this.dataSource.transaction(async (manager) => {
      const host = await this.getLockedHostByUserId(manager, userId);
      await this.lockHostFinancialScope(manager, host.id);
      const earnings = await this.getOrCreateLockedEarnings(manager, host);
      await this.ensureAuthorityInitialized(manager, host, earnings);
      await this.reconcileAggregates(manager, host, earnings);

      const requestRepository = manager.getRepository(HostSettlementRequest);
      const normalizedOperationKey = operationKey?.trim();
      const reserveOperationKey = normalizedOperationKey
        ? `host-settlement:${host.id}:reserve:${normalizedOperationKey}`
        : `host-settlement:${host.id}:reserve:${randomUUID()}`;

      if (normalizedOperationKey) {
        const replay = await requestRepository.findOne({
          where: { reserveOperationKey },
        });
        if (replay) {
          if (Number(replay.amount) !== amount) {
            throw new ConflictException(
              'Host settlement operation key was already used with a different amount',
            );
          }
          return this.reconcileAggregates(manager, host, earnings);
        }
      }

      const available =
        Number(earnings.lifetimeEarnings) -
        Number(earnings.completedSettlements) -
        Number(earnings.pendingSettlements);
      if (amount > available) {
        throw new BadRequestException(
          `Insufficient unsettled earnings balance. Available: $${available.toFixed(2)}`,
        );
      }

      const operationGroupId = `host-settlement:${randomUUID()}`;
      let request = requestRepository.create({
        hostProfileId: host.id,
        userId: host.userId,
        amount,
        settledAmount: 0,
        status: HostSettlementRequestStatus.PENDING,
        operationGroupId,
        reserveOperationKey,
        reservationTransactionId: null,
        settledAt: null,
        settledBy: null,
      });
      request = await requestRepository.save(request);

      const wallet = await this.getOrCreateWallet(manager, host.userId);
      const pendingBefore = Number(earnings.pendingSettlements);
      const transaction = await this.writeLedger(manager, wallet, {
        transactionType: WalletTransactionType.HOST_SETTLEMENT_RESERVE,
        amount,
        balanceType: 'HOST_SETTLEMENT_PENDING',
        source: host.userId,
        destination: 'HOST_SETTLEMENT_RESERVE',
        referenceType: 'HOST_SETTLEMENT_RESERVATION',
        referenceId: request.id,
        operationKey: reserveOperationKey,
        operationGroupId,
        balanceBefore: pendingBefore,
        balanceAfter: pendingBefore + amount,
        remarks: `Reserved $${amount.toFixed(2)} of Host earnings for settlement`,
        metadata: { hostProfileId: host.id },
      });
      request.reservationTransactionId = transaction.id;
      await requestRepository.save(request);

      return this.reconcileAggregates(manager, host, earnings);
    });
  }

  async completeSettlement(
    hostProfileIdOrUserId: string,
    amount: number,
    adminId: string,
    operationKey?: string,
  ): Promise<HostEarnings> {
    this.validateSettlementAmount(amount);

    return this.dataSource.transaction(async (manager) => {
      const host = await this.getLockedHost(manager, hostProfileIdOrUserId);
      if (adminId && (adminId === host.userId || adminId === host.id)) {
        throw new ForbiddenException(
          'Administrators cannot complete settlement payout for their own host profile',
        );
      }

      await this.lockHostFinancialScope(manager, host.id);
      const earnings = await this.getOrCreateLockedEarnings(manager, host);
      await this.ensureAuthorityInitialized(manager, host, earnings);
      await this.reconcileAggregates(manager, host, earnings);

      const normalizedOperationKey = operationKey?.trim();
      const settlementOperationKey = normalizedOperationKey
        ? `host-settlement:${host.id}:complete:${normalizedOperationKey}`
        : `host-settlement:${host.id}:complete:${randomUUID()}`;
      const transactionRepository = manager.getRepository(WalletTransaction);

      if (normalizedOperationKey) {
        const replay = await transactionRepository.findOne({
          where: { operationKey: settlementOperationKey },
        });
        if (replay) {
          if (
            replay.transactionType !== WalletTransactionType.HOST_SETTLEMENT ||
            replay.referenceId !== host.id ||
            Number(replay.amount) !== amount
          ) {
            throw new ConflictException(
              'Host settlement operation key was already used for a different settlement',
            );
          }
          return this.reconcileAggregates(manager, host, earnings);
        }
      }

      const pendingBefore = Number(earnings.pendingSettlements);
      if (amount > pendingBefore) {
        throw new BadRequestException(
          `Settlement amount exceeds reserved pending balance. Pending: $${pendingBefore.toFixed(2)}`,
        );
      }

      const requestRepository = manager.getRepository(HostSettlementRequest);
      const requests = await requestRepository.find({
        where: {
          hostProfileId: host.id,
          status: HostSettlementRequestStatus.PENDING,
        },
        order: { createdAt: 'ASC' },
      });

      let remaining = amount;
      const consumedReservations: Array<{
        requestId: string;
        amount: number;
      }> = [];
      for (const request of requests) {
        if (remaining <= 0) break;
        const requestRemaining =
          Number(request.amount) - Number(request.settledAmount);
        if (requestRemaining <= 0) continue;
        const consumed = Math.min(requestRemaining, remaining);
        request.settledAmount = this.roundMoney(
          Number(request.settledAmount) + consumed,
        );
        remaining = this.roundMoney(remaining - consumed);
        consumedReservations.push({ requestId: request.id, amount: consumed });
        if (Number(request.settledAmount) === Number(request.amount)) {
          request.status = HostSettlementRequestStatus.SETTLED;
          request.settledAt = new Date();
          request.settledBy = adminId;
        }
        await requestRepository.save(request);
      }

      if (remaining > 0) {
        throw new ConflictException(
          'Reserved Host settlement records do not reconcile with pending aggregate',
        );
      }

      const wallet = await this.getOrCreateWallet(manager, host.userId);
      const completedBefore = Number(earnings.completedSettlements);
      await this.writeLedger(manager, wallet, {
        transactionType: WalletTransactionType.HOST_SETTLEMENT,
        amount,
        balanceType: 'HOST_SETTLEMENT_COMPLETED',
        source: host.userId,
        destination: 'HOST_PAYOUT_SYSTEM',
        referenceType: 'HOST_SETTLEMENT',
        referenceId: host.id,
        operationKey: settlementOperationKey,
        operationGroupId: `host-settlement-complete:${randomUUID()}`,
        balanceBefore: completedBefore,
        balanceAfter: completedBefore + amount,
        remarks: `Completed Host settlement payment of $${amount.toFixed(2)}`,
        metadata: {
          hostProfileId: host.id,
          adminId,
          consumedReservations,
          pendingBefore,
          pendingAfter: pendingBefore - amount,
        },
      });

      const auditRepository = manager.getRepository(HostAuditNote);
      await auditRepository.save(
        auditRepository.create({
          hostProfileId: host.id,
          adminId,
          note: `Completed settlement payment of $${amount.toFixed(2)}`,
          action: 'SETTLEMENT_COMPLETED',
        }),
      );

      return this.reconcileAggregates(manager, host, earnings);
    });
  }

  private validateSettlementAmount(amount: number): void {
    if (
      !Number.isFinite(amount) ||
      amount <= 0 ||
      Math.abs(amount - Number(amount.toFixed(2))) > 1e-9
    ) {
      throw new BadRequestException(
        'Settlement amount must be greater than zero with at most two decimal places',
      );
    }
  }

  private async lockHostFinancialScope(
    manager: EntityManager,
    hostProfileId: string,
  ): Promise<void> {
    await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
      `host-financial:${hostProfileId}`,
    ]);
  }

  private async getLockedHostByUserId(
    manager: EntityManager,
    userId: string,
  ): Promise<HostProfile> {
    const host = await manager.getRepository(HostProfile).findOne({
      where: { userId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!host) throw new NotFoundException('Host profile not found');
    return host;
  }

  private async getLockedHost(
    manager: EntityManager,
    hostProfileIdOrUserId: string,
  ): Promise<HostProfile> {
    const repository = manager.getRepository(HostProfile);
    let host = await repository.findOne({
      where: { id: hostProfileIdOrUserId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!host) {
      host = await repository.findOne({
        where: { userId: hostProfileIdOrUserId },
        lock: { mode: 'pessimistic_write' },
      });
    }
    if (!host) throw new NotFoundException('Host profile not found');
    return host;
  }

  private async getOrCreateLockedEarnings(
    manager: EntityManager,
    host: HostProfile,
  ): Promise<HostEarnings> {
    const repository = manager.getRepository(HostEarnings);
    let earnings = await repository.findOne({
      where: { hostProfileId: host.id },
      lock: { mode: 'pessimistic_write' },
    });
    if (!earnings) {
      earnings = await repository.save(
        repository.create({
          hostProfileId: host.id,
          userId: host.userId,
          dailyEarnings: 0,
          weeklyEarnings: 0,
          monthlyEarnings: 0,
          lifetimeEarnings: 0,
          pendingSettlements: 0,
          completedSettlements: 0,
          giftIncome: 0,
          vipBonusIncome: 0,
          roomBonusIncome: 0,
          authorityInitializedAt: null,
          authorityBaselineTransactionId: null,
        }),
      );
    }
    return earnings;
  }

  private async ensureAuthorityInitialized(
    manager: EntityManager,
    host: HostProfile,
    earnings: HostEarnings,
  ): Promise<void> {
    if (earnings.authorityInitializedAt) return;

    const lifetime = Number(earnings.lifetimeEarnings);
    const pending = Number(earnings.pendingSettlements);
    const completed = Number(earnings.completedSettlements);
    if (pending < 0 || completed < 0 || pending + completed > lifetime) {
      throw new ConflictException(
        'Existing Host earnings aggregates cannot be safely reconciled to settlement authority',
      );
    }

    const wallet = await this.getOrCreateWallet(manager, host.userId);
    const baselineGroup = `host-earnings-baseline:${earnings.id}`;
    const baselineTransaction = await this.writeLedger(manager, wallet, {
      transactionType: WalletTransactionType.HOST_EARNINGS,
      amount: lifetime,
      balanceType: 'HOST_EARNINGS',
      source: 'HISTORICAL_HOST_EARNINGS',
      destination: host.userId,
      referenceType: 'HOST_EARNINGS',
      referenceId: host.id,
      operationKey: `${baselineGroup}:earnings`,
      operationGroupId: baselineGroup,
      balanceBefore: 0,
      balanceAfter: lifetime,
      remarks: 'Anchored historical Host earnings aggregate into financial ledger',
      metadata: {
        historicalBaseline: true,
        dailyEarnings: Number(earnings.dailyEarnings),
        weeklyEarnings: Number(earnings.weeklyEarnings),
        monthlyEarnings: Number(earnings.monthlyEarnings),
        giftIncome: Number(earnings.giftIncome),
        vipBonusIncome: Number(earnings.vipBonusIncome),
        roomBonusIncome: Number(earnings.roomBonusIncome),
      },
    });

    if (completed > 0) {
      await this.createHistoricalSettlement(
        manager,
        host,
        wallet,
        completed,
        true,
      );
    }
    if (pending > 0) {
      await this.createHistoricalSettlement(
        manager,
        host,
        wallet,
        pending,
        false,
      );
    }

    earnings.authorityInitializedAt = new Date();
    earnings.authorityBaselineTransactionId = baselineTransaction.id;
    await manager.getRepository(HostEarnings).save(earnings);
  }

  private async createHistoricalSettlement(
    manager: EntityManager,
    host: HostProfile,
    wallet: WalletBalance,
    amount: number,
    settled: boolean,
  ): Promise<void> {
    const operationGroupId = `host-settlement-historical:${randomUUID()}`;
    const reserveOperationKey = `${operationGroupId}:reserve`;
    const requestRepository = manager.getRepository(HostSettlementRequest);
    let request = requestRepository.create({
      hostProfileId: host.id,
      userId: host.userId,
      amount,
      settledAmount: settled ? amount : 0,
      status: settled
        ? HostSettlementRequestStatus.SETTLED
        : HostSettlementRequestStatus.PENDING,
      operationGroupId,
      reserveOperationKey,
      reservationTransactionId: null,
      settledAt: settled ? new Date() : null,
      settledBy: settled ? 'HISTORICAL_BASELINE' : null,
    });
    request = await requestRepository.save(request);

    const reserveTransaction = await this.writeLedger(manager, wallet, {
      transactionType: WalletTransactionType.HOST_SETTLEMENT_RESERVE,
      amount,
      balanceType: 'HOST_SETTLEMENT_PENDING',
      source: host.userId,
      destination: 'HOST_SETTLEMENT_RESERVE',
      referenceType: 'HOST_SETTLEMENT_RESERVATION',
      referenceId: request.id,
      operationKey: reserveOperationKey,
      operationGroupId,
      balanceBefore: 0,
      balanceAfter: amount,
      remarks: 'Anchored historical Host settlement reservation',
      metadata: { hostProfileId: host.id, historicalBaseline: true },
    });
    request.reservationTransactionId = reserveTransaction.id;
    await requestRepository.save(request);

    if (settled) {
      await this.writeLedger(manager, wallet, {
        transactionType: WalletTransactionType.HOST_SETTLEMENT,
        amount,
        balanceType: 'HOST_SETTLEMENT_COMPLETED',
        source: host.userId,
        destination: 'HOST_PAYOUT_SYSTEM',
        referenceType: 'HOST_SETTLEMENT',
        referenceId: host.id,
        operationKey: `${operationGroupId}:settle`,
        operationGroupId,
        balanceBefore: 0,
        balanceAfter: amount,
        remarks: 'Anchored historical completed Host settlement',
        metadata: { hostProfileId: host.id, historicalBaseline: true },
      });
    }
  }

  private async reconcileAggregates(
    manager: EntityManager,
    host: HostProfile,
    earnings: HostEarnings,
  ): Promise<HostEarnings> {
    const transactionRepository = manager.getRepository(WalletTransaction);
    const earningTransactions = await transactionRepository.find({
      where: {
        userId: host.userId,
        transactionType: WalletTransactionType.HOST_EARNINGS,
        status: WalletTransactionStatus.COMPLETED,
        referenceType: 'HOST_EARNINGS',
        referenceId: host.id,
      },
    });
    const settlementTransactions = await transactionRepository.find({
      where: {
        userId: host.userId,
        transactionType: WalletTransactionType.HOST_SETTLEMENT,
        status: WalletTransactionStatus.COMPLETED,
        referenceType: 'HOST_SETTLEMENT',
        referenceId: host.id,
      },
    });
    const requests = await manager.getRepository(HostSettlementRequest).find({
      where: { hostProfileId: host.id },
    });

    const lifetime = this.roundMoney(
      earningTransactions.reduce(
        (sum, transaction) => sum + Number(transaction.amount),
        0,
      ),
    );
    const completed = this.roundMoney(
      settlementTransactions.reduce(
        (sum, transaction) => sum + Number(transaction.amount),
        0,
      ),
    );
    let pending = 0;
    for (const request of requests) {
      const requestAmount = Number(request.amount);
      const settledAmount = Number(request.settledAmount);
      if (settledAmount < 0 || settledAmount > requestAmount) {
        throw new ConflictException(
          'Host settlement reservation contains invalid settled amount',
        );
      }
      pending += requestAmount - settledAmount;
    }
    pending = this.roundMoney(pending);

    if (completed + pending > lifetime) {
      throw new ConflictException(
        'Host earnings ledger reconciliation detected over-reserved or over-settled value',
      );
    }

    earnings.lifetimeEarnings = lifetime;
    earnings.pendingSettlements = pending;
    earnings.completedSettlements = completed;
    return manager.getRepository(HostEarnings).save(earnings);
  }

  private roundMoney(value: number): number {
    return Number(value.toFixed(2));
  }

  private async getOrCreateWallet(
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

  private async writeLedger(
    manager: EntityManager,
    wallet: WalletBalance,
    input: {
      transactionType: WalletTransactionType;
      amount: number;
      balanceType: string;
      source: string;
      destination: string;
      referenceType: string;
      referenceId: string;
      operationKey: string;
      operationGroupId: string;
      balanceBefore: number;
      balanceAfter: number;
      remarks: string;
      metadata: Record<string, unknown>;
    },
  ): Promise<WalletTransaction> {
    const repository = manager.getRepository(WalletTransaction);
    const existing = await repository.findOne({
      where: { operationKey: input.operationKey },
    });
    if (existing) {
      if (
        existing.transactionType !== input.transactionType ||
        existing.referenceType !== input.referenceType ||
        existing.referenceId !== input.referenceId ||
        Number(existing.amount) !== input.amount ||
        existing.operationGroupId !== input.operationGroupId
      ) {
        throw new ConflictException(
          'Host financial operation key is already bound to different ledger evidence',
        );
      }
      return existing;
    }

    return repository.save(
      repository.create({
        walletId: wallet.id,
        userId: wallet.userId,
        transactionType: input.transactionType,
        amount: input.amount,
        currency: WalletCurrency.USD,
        balanceType: input.balanceType,
        source: input.source,
        destination: input.destination,
        referenceType: input.referenceType,
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
