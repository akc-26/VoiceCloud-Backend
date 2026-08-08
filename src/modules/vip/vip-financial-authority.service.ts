import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { DataSource, EntityManager } from 'typeorm';
import {
  PaymentProviderType,
  WalletBalanceType,
  WalletCurrency,
  WalletTransactionStatus,
  WalletTransactionType,
} from '../../common/enums';
import { EventsGateway } from '../../common/events/events.gateway';
import { RedisService } from '../../redis/redis.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { User } from '../users/entities/user.entity';
import { WalletBalance } from '../wallet/entities/wallet-balance.entity';
import { WalletTransaction } from '../wallet/entities/wallet-transaction.entity';
import { PaymentGatewayFactory } from '../wallet/providers/payment-gateway.factory';
import { WalletMutationService } from '../wallet/wallet-mutation.service';
import { RenewVipDto } from './dto/renew-vip.dto';
import { SubscribeVipDto } from './dto/subscribe-vip.dto';
import { UpgradeDowngradeVipDto } from './dto/upgrade-downgrade-vip.dto';
import {
  SubscriptionCycle,
  VipMembership,
  VipReward,
  VipRewardClaim,
  VipRewardType,
  VipStatus,
  VipTier,
  VipTransaction,
} from './entities';
import { VIP_REDIS_KEYS } from './vip.constants';

type PaidDto = SubscribeVipDto | RenewVipDto | UpgradeDowngradeVipDto;
type Action = 'SUBSCRIBE' | 'RENEW' | 'UPGRADE' | 'DOWNGRADE';

@Injectable()
export class VipFinancialAuthorityService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly paymentGatewayFactory: PaymentGatewayFactory,
    private readonly walletMutationService: WalletMutationService,
    private readonly redisService: RedisService,
    private readonly notificationsService: NotificationsService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async subscribe(userId: string, dto: SubscribeVipDto) {
    const tierId = dto.tierId || dto.planId;
    if (!tierId) throw new BadRequestException('tierId or planId is required');
    return this.settleMembership(userId, tierId, dto, 'SUBSCRIBE');
  }

  async renew(userId: string, dto: RenewVipDto) {
    const current = await this.dataSource
      .getRepository(VipMembership)
      .findOne({ where: { userId } });
    if (!current)
      throw new NotFoundException(
        'No existing VIP membership record found to renew',
      );
    return this.settleMembership(
      userId,
      dto.tierId || dto.planId || current.tierId,
      dto,
      'RENEW',
    );
  }

  async changeTier(
    userId: string,
    dto: UpgradeDowngradeVipDto,
    upgrade: boolean,
  ) {
    return this.settleMembership(
      userId,
      dto.newTierId,
      dto,
      upgrade ? 'UPGRADE' : 'DOWNGRADE',
    );
  }

  async claimReward(userId: string, rewardId: string): Promise<VipRewardClaim> {
    const result = await this.dataSource.transaction(async (manager) => {
      const membership = await manager
        .getRepository(VipMembership)
        .createQueryBuilder('membership')
        .setLock('pessimistic_write')
        .where('membership.userId = :userId', { userId })
        .getOne();
      if (
        !membership ||
        membership.status !== VipStatus.ACTIVE ||
        membership.expiresAt <= new Date()
      ) {
        throw new BadRequestException(
          'Active VIP membership is required to claim VIP rewards',
        );
      }
      const reward = await manager
        .getRepository(VipReward)
        .findOne({ where: { id: rewardId } });
      if (!reward || !reward.isActive)
        throw new NotFoundException('VIP Reward not found or inactive');
      if (membership.level < reward.minVipLevel)
        throw new BadRequestException(
          'VIP level does not meet reward requirement',
        );

      const periodKey = this.getPeriodKey(reward.rewardType);
      const operationKey = `vip-reward:${userId}:${reward.id}:${periodKey}`;
      await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
        operationKey,
      ]);
      const repo = manager.getRepository(VipRewardClaim);
      const replay = await repo.findOne({
        where: { userId, rewardId: reward.id, periodKey },
      });
      if (replay) return replay;

      let walletTransactionId: string | null = null;
      if (Number(reward.coins || 0) > 0) {
        const wallet = await this.walletMutationService.creditInTransaction(
          manager,
          {
            userId,
            transactionType: WalletTransactionType.VIP_REWARD,
            amount: Number(reward.coins),
            balanceType: WalletBalanceType.COIN,
            source: 'VIP_REWARD',
            destination: userId,
            referenceType: 'VIP_REWARD',
            referenceId: reward.id,
            operationKey: `${operationKey}:wallet`,
            operationGroupId: operationKey,
            description: reward.title,
          },
        );
        walletTransactionId = wallet.transaction.id;
      }
      membership.experience =
        Number(membership.experience || 0) + Number(reward.exp || 0);
      await manager.getRepository(VipMembership).save(membership);
      return repo.save(
        repo.create({
          userId,
          rewardId: reward.id,
          rewardType: reward.rewardType,
          coinsClaimed: Number(reward.coins || 0),
          expClaimed: Number(reward.exp || 0),
          periodKey,
          operationKey,
          walletTransactionId,
        }),
      );
    });
    await this.redisService.del(VIP_REDIS_KEYS.SESSION_CACHE(userId));
    return result;
  }

  private async settleMembership(
    userId: string,
    tierId: string,
    dto: PaidDto,
    action: Action,
  ): Promise<VipMembership> {
    const tier = await this.dataSource
      .getRepository(VipTier)
      .findOne({ where: { id: tierId } });
    if (!tier) throw new NotFoundException(`VIP Tier ${tierId} not found`);
    if (!tier.activationStatus && !tier.isActive)
      throw new BadRequestException(
        `VIP Tier '${tier.name}' is currently inactive`,
      );
    const cycle = dto.cycle || SubscriptionCycle.MONTHLY;
    const terms = this.getCycleTerms(tier, cycle);
    const payment = await this.validatePayment(dto, action, terms.price);

    const membership = await this.dataSource.transaction(async (manager) => {
      await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
        `vip-membership:${userId}`,
      ]);
      await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
        payment.operationKey,
      ]);
      const txRepo = manager.getRepository(VipTransaction);
      const replay = await txRepo.findOne({
        where: { operationKey: payment.operationKey },
      });
      if (replay) {
        if (
          replay.userId !== userId ||
          replay.tierId !== tier.id ||
          replay.action !== action
        ) {
          throw new ConflictException(
            'VIP operation key is already bound to another purchase',
          );
        }
        const existing = await manager
          .getRepository(VipMembership)
          .findOne({ where: { userId } });
        if (!existing)
          throw new ConflictException(
            'VIP payment replay is missing committed membership',
          );
        return existing;
      }

      const wallet = await this.getOrCreateLockedWallet(manager, userId);
      const ledger = await manager.getRepository(WalletTransaction).save(
        manager.getRepository(WalletTransaction).create({
          walletId: wallet.id,
          userId,
          transactionType: WalletTransactionType.VIP_PURCHASE,
          amount: terms.price,
          currency: WalletCurrency.USD,
          balanceType: WalletBalanceType.EXTERNAL_PAYMENT,
          source: payment.provider,
          destination: 'VIP_MEMBERSHIP',
          referenceType: 'VIP_TIER',
          referenceId: tier.id,
          status: WalletTransactionStatus.COMPLETED,
          description: `${action} ${tier.name} (${cycle})`,
          metadata: {
            providerTransactionId: payment.transactionId,
            cycle,
            action,
          },
          operationKey: `${payment.operationKey}:ledger`,
          operationGroupId: payment.operationKey,
          balanceBefore: 0,
          balanceAfter: 0,
        }),
      );

      const membershipRepo = manager.getRepository(VipMembership);
      let current = await membershipRepo
        .createQueryBuilder('membership')
        .setLock('pessimistic_write')
        .where('membership.userId = :userId', { userId })
        .getOne();
      const now = new Date();
      const base =
        (action === 'SUBSCRIBE' || action === 'RENEW') &&
        current?.expiresAt &&
        current.expiresAt > now
          ? current.expiresAt
          : now;
      const expiresAt = new Date(
        base.getTime() + terms.durationDays * 86400000,
      );
      if (!current) current = membershipRepo.create({ userId });
      current.tierId = tier.id;
      current.planId = tier.id;
      current.tierName = tier.name;
      current.planName = tier.name;
      current.level = tier.level;
      current.badgeUrl = tier.badgeUrl || tier.badge || '';
      current.colorTheme = tier.colorTheme || '#FFD700';
      current.benefits = tier.benefits || [];
      current.status = VipStatus.ACTIVE;
      current.subscriptionCycle = cycle;
      current.autoRenew =
        'autoRenew' in dto
          ? (dto.autoRenew ?? true)
          : (current.autoRenew ?? true);
      current.startDate = current.startDate || now;
      current.expiresAt = expiresAt;
      current.cancelledAt = null;
      current.lifetimeSpending =
        Number(current.lifetimeSpending || 0) + terms.price;
      current = await membershipRepo.save(current);
      await txRepo.save(
        txRepo.create({
          userId,
          tierId: tier.id,
          planId: tier.id,
          tierName: tier.name,
          planName: tier.name,
          amount: terms.price,
          durationDays: terms.durationDays,
          cycle,
          action,
          status: 'SUCCESS',
          operationKey: payment.operationKey,
          paymentProvider: payment.provider,
          paymentReference: payment.transactionId,
          currency: 'USD',
          walletTransactionId: ledger.id,
        }),
      );
      return current;
    });

    await this.redisService.del(VIP_REDIS_KEYS.SESSION_CACHE(userId));
    await this.redisService.del(VIP_REDIS_KEYS.PROGRESS_CACHE(userId));
    try {
      await this.notificationsService.createNotification({
        userId,
        type: NotificationType.SYSTEM,
        title: 'VIP Membership Updated!',
        message: `${tier.name} is active until ${membership.expiresAt.toISOString()}.`,
        data: {
          tierId: tier.id,
          action,
          expiresAt: membership.expiresAt.toISOString(),
        },
        operationKey: `notification:${payment.operationKey}`,
      });
    } catch {
      /* financial commit is authoritative */
    }
    this.eventsGateway.broadcastVipEvent('vip:status_updated', {
      userId,
      status: VipStatus.ACTIVE,
      level: tier.level,
      tierName: tier.name,
      action,
    });
    return membership;
  }

  private async validatePayment(dto: PaidDto, action: Action, price: number) {
    const provider = dto.provider;
    const receipt = dto.receipt?.trim();
    if (!provider || !receipt || provider === PaymentProviderType.MOCK) {
      throw new BadRequestException(
        'A supported payment provider and verified receipt are required for VIP activation',
      );
    }
    const gateway = this.paymentGatewayFactory.getProvider(provider);
    const result = await gateway.validateReceipt(receipt, {
      price,
      coinAmount: 0,
      bonusCoins: 0,
      currency: 'USD',
    });
    if (!result.isValid || Math.abs(Number(result.amount) - price) > 0.01)
      throw new BadRequestException(
        result.errorMessage || 'VIP payment receipt validation failed',
      );
    if (
      dto.signature &&
      !(await gateway.verifySignature(receipt, dto.signature))
    )
      throw new BadRequestException('VIP payment signature validation failed');
    return {
      provider,
      transactionId: result.transactionId,
      operationKey:
        dto.operationKey?.trim() ||
        `vip:${action}:${provider}:${createHash('sha256').update(receipt).digest('hex')}`,
    };
  }

  private async getOrCreateLockedWallet(
    manager: EntityManager,
    userId: string,
  ) {
    const user = await manager
      .getRepository(User)
      .findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    let wallet = await manager
      .getRepository(WalletBalance)
      .createQueryBuilder('wallet')
      .setLock('pessimistic_write')
      .where('wallet.userId = :userId', { userId })
      .getOne();
    if (!wallet)
      wallet = await manager.getRepository(WalletBalance).save(
        manager.getRepository(WalletBalance).create({
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
    return wallet;
  }

  private getCycleTerms(tier: VipTier, cycle: SubscriptionCycle) {
    const monthly = Number(tier.monthlyPrice || tier.price || 9.99);
    if (cycle === SubscriptionCycle.QUARTERLY)
      return {
        durationDays: 90,
        price: Number(tier.quarterlyPrice || monthly * 2.7),
      };
    if (cycle === SubscriptionCycle.YEARLY)
      return {
        durationDays: 365,
        price: Number(tier.yearlyPrice || monthly * 10),
      };
    return { durationDays: 30, price: monthly };
  }

  private getPeriodKey(type: VipRewardType) {
    const now = new Date();
    if (type === VipRewardType.DAILY) return now.toISOString().slice(0, 10);
    if (type === VipRewardType.MONTHLY) return now.toISOString().slice(0, 7);
    const date = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    const day = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - day);
    const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const week = Math.ceil(
      ((date.getTime() - start.getTime()) / 86400000 + 1) / 7,
    );
    return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
  }
}
