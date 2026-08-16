import { BadRequestException, Injectable } from '@nestjs/common';
import { randomInt, randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import {
  WalletBalanceType,
  WalletTransactionType,
} from '../../common/enums';
import { EventsGateway } from '../../common/events/events.gateway';
import { WalletMutationService } from '../wallet/wallet-mutation.service';
import { OpenLuckyBoxDto, LuckyBoxTier } from './dto/lucky-box.dto';
import { LuckyBoxOpening } from './entities/lucky-box-opening.entity';

export interface LuckyBoxReward {
  type: 'COIN_CASHBACK' | 'GIFT_MULTIPLIER' | 'RARE_BADGE' | 'ROOM_EFFECT';
  name: string;
  value: number;
  multiplier?: number;
  description: string;
}

@Injectable()
export class LuckyBoxService {
  private readonly TIER_PRICES: Record<LuckyBoxTier, number> = {
    [LuckyBoxTier.BRONZE]: 50,
    [LuckyBoxTier.SILVER]: 200,
    [LuckyBoxTier.GOLD]: 1000,
    [LuckyBoxTier.DIAMOND]: 5000,
  };

  constructor(
    private readonly eventsGateway: EventsGateway,
    private readonly dataSource: DataSource,
    private readonly walletMutationService: WalletMutationService,
  ) {}

  async openLuckyBox(userId: string, dto: OpenLuckyBoxDto) {
    const { tier, count = 1, roomId } = dto;
    if (!Number.isInteger(count) || count < 1) {
      throw new BadRequestException('Lucky Box count must be a positive integer');
    }
    const pricePerBox = this.TIER_PRICES[tier];
    if (!pricePerBox) throw new BadRequestException('Unknown Lucky Box tier');
    const totalCost = pricePerBox * count;
    const operationKey = dto.operationKey?.trim() || `lucky-box:${randomUUID()}`;

    const result = await this.dataSource.transaction(async (manager) => {
      await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
        operationKey,
      ]);
      const repository = manager.getRepository(LuckyBoxOpening);
      const replay = await repository.findOne({ where: { operationKey } });
      if (replay) {
        return { payload: replay.resultPayload, idempotent: true };
      }

      const debit = await this.walletMutationService.debitInTransaction(
        manager,
        {
          userId,
          transactionType: WalletTransactionType.LUCKY_BOX_PURCHASE,
          amount: totalCost,
          balanceType: WalletBalanceType.COIN,
          source: userId,
          destination: 'LUCKY_BOX',
          referenceType: 'LUCKY_BOX_OPENING',
          referenceId: operationKey,
          description: `Opened ${count} ${tier} Lucky Box(es)`,
          operationKey: `${operationKey}:debit`,
          operationGroupId: operationKey,
        },
      );

      const rewards: LuckyBoxReward[] = [];
      let cashbackCoins = 0;
      for (let i = 0; i < count; i++) {
        const reward = this.rollBoxReward(tier, pricePerBox);
        rewards.push(reward);
        if (reward.type === 'COIN_CASHBACK') cashbackCoins += reward.value;
      }

      let cashbackTransactionId: string | null = null;
      let finalCoinBalance = debit.wallet.coinBalance;
      if (cashbackCoins > 0) {
        const credit = await this.walletMutationService.creditInTransaction(
          manager,
          {
            userId,
            transactionType: WalletTransactionType.LUCKY_BOX_REWARD,
            amount: cashbackCoins,
            balanceType: WalletBalanceType.COIN,
            source: 'LUCKY_BOX',
            destination: userId,
            referenceType: 'LUCKY_BOX_OPENING',
            referenceId: operationKey,
            description: 'Lucky Box cashback reward',
            operationKey: `${operationKey}:cashback`,
            operationGroupId: operationKey,
          },
        );
        cashbackTransactionId = credit.transaction.id;
        finalCoinBalance = credit.wallet.coinBalance;
      }

      const payload = {
        userId,
        tier,
        count,
        totalSpentCoins: totalCost,
        cashbackCoinsReceived: cashbackCoins,
        netCoinsDelta: cashbackCoins - totalCost,
        finalCoinBalance,
        rewards,
        operationKey,
        timestamp: new Date().toISOString(),
      };
      await repository.save(
        repository.create({
          operationKey,
          userId,
          tier,
          count,
          roomId: roomId || null,
          totalCost,
          cashbackCoins,
          debitWalletTransactionId: debit.transaction.id,
          cashbackWalletTransactionId: cashbackTransactionId,
          resultPayload: payload,
        }),
      );
      return { payload, idempotent: false };
    });

    const rewards = (result.payload.rewards || []) as LuckyBoxReward[];
    const hasJackpot = rewards.some((r) => r.multiplier && r.multiplier >= 10);
    if (!result.idempotent && roomId && hasJackpot) {
      this.eventsGateway.server
        .to(`room:${roomId}`)
        .emit('room_jackpot_announcement', { userId, roomId, tier, rewards });
    }

    return {
      success: true,
      message: `Opened ${count} ${tier.toUpperCase()} Lucky Box(es) successfully`,
      data: result.payload,
      idempotent: result.idempotent,
    };
  }

  private rollBoxReward(tier: LuckyBoxTier, pricePerBox: number): LuckyBoxReward {
    // Financially meaningful reward selection uses cryptographic randomness.
    const roll = randomInt(0, 1_000_000) / 10_000;
    if (roll < 2) {
      const mult = tier === LuckyBoxTier.DIAMOND ? 50 : 10;
      const val = pricePerBox * mult;
      return { type: 'COIN_CASHBACK', name: `${mult}x Mega Jackpot Cashback`, value: val, multiplier: mult, description: `Jackpot! Won ${val} coins cashback!` };
    }
    if (roll < 15) {
      const mult = 3;
      const val = pricePerBox * mult;
      return { type: 'COIN_CASHBACK', name: `${mult}x Lucky Cashback`, value: val, multiplier: mult, description: `Lucky win! Earned ${val} coins!` };
    }
    if (roll < 45) {
      const val = Math.floor(pricePerBox * 1.2);
      return { type: 'COIN_CASHBACK', name: 'Standard Coin Yield', value: val, multiplier: 1.2, description: `Earned ${val} coins!` };
    }
    if (roll < 75) {
      return { type: 'ROOM_EFFECT', name: 'Golden Dragon Entrance Visual', value: pricePerBox, description: 'Unlocked 24hr Exclusive Golden Dragon Entrance Animation' };
    }
    const val = Math.floor(pricePerBox * 0.5);
    return { type: 'COIN_CASHBACK', name: 'Consolation Cashback', value: val, multiplier: 0.5, description: `Returned ${val} coins.` };
  }
}
