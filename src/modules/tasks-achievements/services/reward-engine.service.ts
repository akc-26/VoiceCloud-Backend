import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { DataSource, EntityManager, Repository } from 'typeorm';
import {
  WalletBalanceType,
  WalletTransactionType,
} from '../../../common/enums';
import { EventsGateway } from '../../../common/events/events.gateway';
import { WalletMutationService } from '../../wallet/wallet-mutation.service';
import {
  RewardAuditLog,
  RewardType,
} from '../entities/reward-audit-log.entity';

export interface RewardPayload {
  coins?: number;
  diamonds?: number;
  xp?: number;
  vipDays?: number;
  profileFrame?: string;
  chatBubble?: string;
  entranceEffect?: string;
  exclusiveSticker?: string;
  badge?: string;
  metadata?: string;
}

@Injectable()
export class RewardEngineService {
  private readonly logger = new Logger(RewardEngineService.name);

  constructor(
    @InjectRepository(RewardAuditLog)
    private readonly rewardAuditLogRepository: Repository<RewardAuditLog>,
    private readonly eventsGateway: EventsGateway,
    private readonly dataSource: DataSource,
    private readonly walletMutationService: WalletMutationService,
  ) {}

  async distributeReward(
    userId: string,
    payload: RewardPayload,
    source: string,
    sourceId?: string,
    operationKey?: string,
  ): Promise<RewardAuditLog[]> {
    const baseOperationKey =
      operationKey?.trim() ||
      (sourceId && source !== 'admin_grant'
        ? `reward:${source}:${sourceId}:${userId}`
        : `reward:${randomUUID()}:${userId}`);

    const auditLogs = await this.dataSource.transaction(async (manager) => {
      await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
        baseOperationKey,
      ]);
      const results: RewardAuditLog[] = [];

      if (Number(payload.coins || 0) > 0) {
        results.push(
          await this.settleCurrencyReward(manager, {
            userId,
            rewardType: RewardType.COINS,
            amount: Number(payload.coins),
            balanceType: WalletBalanceType.COIN,
            source,
            sourceId,
            metadata: payload.metadata || `Coins earned via ${source}`,
            operationKey: `${baseOperationKey}:coins`,
          }),
        );
      }

      if (Number(payload.diamonds || 0) > 0) {
        results.push(
          await this.settleCurrencyReward(manager, {
            userId,
            rewardType: RewardType.DIAMONDS,
            amount: Number(payload.diamonds),
            balanceType: WalletBalanceType.DIAMOND,
            source,
            sourceId,
            metadata: payload.metadata || `Diamonds earned via ${source}`,
            operationKey: `${baseOperationKey}:diamonds`,
          }),
        );
      }

      const nonFinancial: Array<{
        type: RewardType;
        amount: number;
        metadata: string;
        suffix: string;
      }> = [];
      if (Number(payload.xp || 0) > 0) {
        nonFinancial.push({
          type: RewardType.XP,
          amount: Number(payload.xp),
          metadata: payload.metadata || `XP gained via ${source}`,
          suffix: 'xp',
        });
      }
      if (Number(payload.vipDays || 0) > 0) {
        nonFinancial.push({
          type: RewardType.VIP_TRIAL,
          amount: Number(payload.vipDays),
          metadata:
            payload.metadata || `${payload.vipDays} VIP trial days granted`,
          suffix: 'vip-trial',
        });
      }
      const itemRewards: Array<[RewardType, string | undefined, string]> = [
        [RewardType.PROFILE_FRAME, payload.profileFrame, 'profile-frame'],
        [RewardType.CHAT_BUBBLE, payload.chatBubble, 'chat-bubble'],
        [RewardType.ENTRANCE_EFFECT, payload.entranceEffect, 'entrance-effect'],
        [RewardType.EXCLUSIVE_STICKER, payload.exclusiveSticker, 'sticker'],
        [RewardType.BADGE, payload.badge, 'badge'],
      ];
      for (const [type, value, suffix] of itemRewards) {
        if (value) nonFinancial.push({ type, amount: 1, metadata: value, suffix });
      }

      for (const reward of nonFinancial) {
        results.push(
          await this.writeNonFinancialAudit(manager, {
            userId,
            rewardType: reward.type,
            amount: reward.amount,
            source,
            sourceId,
            metadata: reward.metadata,
            operationKey: `${baseOperationKey}:${reward.suffix}`,
          }),
        );
      }
      return results;
    });

    this.logger.log(
      `Distributed ${auditLogs.length} durable rewards to user ${userId} from ${source}`,
    );
    if (this.eventsGateway?.server) {
      this.eventsGateway.server.emit('reward_claimed', {
        userId,
        payload,
        source,
        sourceId,
        operationKey: baseOperationKey,
        timestamp: new Date().toISOString(),
      });
    }
    return auditLogs;
  }

  private async settleCurrencyReward(
    manager: EntityManager,
    input: {
      userId: string;
      rewardType: RewardType;
      amount: number;
      balanceType: WalletBalanceType;
      source: string;
      sourceId?: string;
      metadata: string;
      operationKey: string;
    },
  ): Promise<RewardAuditLog> {
    const repository = manager.getRepository(RewardAuditLog);
    const replay = await repository.findOne({
      where: { operationKey: input.operationKey },
    });
    if (replay) return replay;

    const walletResult = await this.walletMutationService.creditInTransaction(
      manager,
      {
        userId: input.userId,
        transactionType: WalletTransactionType.REWARD_CREDIT,
        amount: input.amount,
        balanceType: input.balanceType,
        source: input.source,
        destination: input.userId,
        referenceType: 'REWARD',
        referenceId: input.sourceId || input.source,
        description: input.metadata,
        operationKey: `${input.operationKey}:wallet`,
        operationGroupId: input.operationKey,
        metadata: {
          rewardType: input.rewardType,
          rewardSource: input.source,
          sourceId: input.sourceId,
        },
      },
    );

    const log = repository.create({
      userId: input.userId,
      rewardType: input.rewardType,
      amount: input.amount,
      source: input.source,
      sourceId: input.sourceId,
      metadata: input.metadata,
      operationKey: input.operationKey,
      walletTransactionId: walletResult.transaction.id,
      settledAt: new Date(),
    });
    return repository.save(log);
  }

  private async writeNonFinancialAudit(
    manager: EntityManager,
    input: {
      userId: string;
      rewardType: RewardType;
      amount: number;
      source: string;
      sourceId?: string;
      metadata: string;
      operationKey: string;
    },
  ): Promise<RewardAuditLog> {
    const repository = manager.getRepository(RewardAuditLog);
    const replay = await repository.findOne({
      where: { operationKey: input.operationKey },
    });
    if (replay) return replay;
    return repository.save(
      repository.create({
        ...input,
        walletTransactionId: null,
        settledAt: new Date(),
      }),
    );
  }
}
