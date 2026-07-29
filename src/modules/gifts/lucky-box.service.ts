import { Injectable, BadRequestException } from '@nestjs/common';
import { OpenLuckyBoxDto, LuckyBoxTier } from './dto/lucky-box.dto';
import { RedisService } from '../../redis/redis.service';
import { EventsGateway } from '../../common/events/events.gateway';

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
    private readonly redisService: RedisService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async openLuckyBox(userId: string, dto: OpenLuckyBoxDto) {
    const { tier, count = 1, roomId } = dto;
    const pricePerBox = this.TIER_PRICES[tier] || 100;
    const totalCost = pricePerBox * count;

    // Check user coins
    const coinsRaw = await this.redisService.get(`wallet:${userId}:coins`);
    const currentCoins = coinsRaw ? parseInt(coinsRaw, 10) : 10000;

    if (currentCoins < totalCost) {
      throw new BadRequestException(
        `Insufficient coins for Lucky Box. Required: ${totalCost}, Available: ${currentCoins}`,
      );
    }

    // Deduct coins
    const remainingCoins = currentCoins - totalCost;
    await this.redisService.set(
      `wallet:${userId}:coins`,
      remainingCoins.toString(),
    );

    // Generate rewards based on weighted probability matrix
    const rewards: LuckyBoxReward[] = [];
    let totalCashbackCoins = 0;

    for (let i = 0; i < count; i++) {
      const reward = this.rollBoxReward(tier, pricePerBox);
      rewards.push(reward);
      if (reward.type === 'COIN_CASHBACK') {
        totalCashbackCoins += reward.value;
      }
    }

    // Credit cashback coins if any
    const finalCoins = remainingCoins + totalCashbackCoins;
    await this.redisService.set(
      `wallet:${userId}:coins`,
      finalCoins.toString(),
    );

    const resultPayload = {
      userId,
      tier,
      count,
      totalSpentCoins: totalCost,
      cashbackCoinsReceived: totalCashbackCoins,
      netCoinsDelta: totalCashbackCoins - totalCost,
      finalCoinBalance: finalCoins,
      rewards,
      timestamp: new Date().toISOString(),
    };

    // Broadcast rare rewards to room if opened in a live room
    const hasJackpot = rewards.some((r) => r.multiplier && r.multiplier >= 10);
    if (roomId && hasJackpot) {
      this.eventsGateway.server
        .to(`room:${roomId}`)
        .emit('room_jackpot_announcement', {
          userId,
          roomId,
          tier,
          rewards,
        });
    }

    return {
      success: true,
      message: `Opened ${count} ${tier.toUpperCase()} Lucky Box(es) successfully`,
      data: resultPayload,
    };
  }

  private rollBoxReward(
    tier: LuckyBoxTier,
    pricePerBox: number,
  ): LuckyBoxReward {
    const roll = Math.random() * 100; // 0 - 100

    if (roll < 2) {
      // 2% Mega Jackpot (10x - 50x)
      const mult = tier === LuckyBoxTier.DIAMOND ? 50 : 10;
      const val = pricePerBox * mult;
      return {
        type: 'COIN_CASHBACK',
        name: `${mult}x Mega Jackpot Cashback`,
        value: val,
        multiplier: mult,
        description: `Jackpot! Won ${val} coins cashback!`,
      };
    } else if (roll < 15) {
      // 13% High Win (2x - 5x)
      const mult = 3;
      const val = pricePerBox * mult;
      return {
        type: 'COIN_CASHBACK',
        name: `${mult}x Lucky Cashback`,
        value: val,
        multiplier: mult,
        description: `Lucky win! Earned ${val} coins!`,
      };
    } else if (roll < 45) {
      // 30% Medium Win (1x - 1.5x)
      const val = Math.floor(pricePerBox * 1.2);
      return {
        type: 'COIN_CASHBACK',
        name: 'Standard Coin Yield',
        value: val,
        multiplier: 1.2,
        description: `Earned ${val} coins!`,
      };
    } else if (roll < 75) {
      // 30% Rare Room Entrance Effect
      return {
        type: 'ROOM_EFFECT',
        name: 'Golden Dragon Entrance Visual',
        value: pricePerBox,
        description: 'Unlocked 24hr Exclusive Golden Dragon Entrance Animation',
      };
    } else {
      // 25% Small Coin Return (0.5x)
      const val = Math.floor(pricePerBox * 0.5);
      return {
        type: 'COIN_CASHBACK',
        name: 'Consolation Cashback',
        value: val,
        multiplier: 0.5,
        description: `Returned ${val} coins.`,
      };
    }
  }
}
