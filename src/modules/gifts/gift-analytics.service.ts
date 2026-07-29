import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GiftTransaction } from './entities/gift-transaction.entity';

@Injectable()
export class GiftAnalyticsService {
  constructor(
    @InjectRepository(GiftTransaction)
    private readonly transactionRepository: Repository<GiftTransaction>,
  ) {}

  async getTopGifts(
    timeframe: 'hourly' | 'daily' | 'weekly' | 'monthly' = 'daily',
  ) {
    const cutoff = this.getTimeframeCutoff(timeframe);
    const txs = await this.transactionRepository.find({
      order: { createdAt: 'DESC' },
    });

    const filtered = txs.filter((t) => !cutoff || t.createdAt >= cutoff);

    const map = new Map<
      string,
      { giftId: string; giftName: string; totalCoins: number; count: number }
    >();

    for (const t of filtered) {
      const key = t.giftId;
      const existing = map.get(key) || {
        giftId: t.giftId,
        giftName: t.giftName || 'Virtual Gift',
        totalCoins: 0,
        count: 0,
      };
      existing.totalCoins += t.totalCoins;
      existing.count += t.quantity;
      map.set(key, existing);
    }

    return Array.from(map.values())
      .sort((a, b) => b.totalCoins - a.totalCoins)
      .slice(0, 20);
  }

  async getTopSenders(
    timeframe: 'hourly' | 'daily' | 'weekly' | 'monthly' = 'daily',
  ) {
    const cutoff = this.getTimeframeCutoff(timeframe);
    const txs = await this.transactionRepository.find({
      order: { createdAt: 'DESC' },
    });

    const filtered = txs.filter((t) => !cutoff || t.createdAt >= cutoff);

    const map = new Map<
      string,
      { senderId: string; totalCoins: number; totalGifts: number }
    >();

    for (const t of filtered) {
      const key = t.senderId;
      const existing = map.get(key) || {
        senderId: t.senderId,
        totalCoins: 0,
        totalGifts: 0,
      };
      existing.totalCoins += t.totalCoins;
      existing.totalGifts += t.quantity;
      map.set(key, existing);
    }

    return Array.from(map.values())
      .sort((a, b) => b.totalCoins - a.totalCoins)
      .slice(0, 20);
  }

  async getTopReceivers(
    timeframe: 'hourly' | 'daily' | 'weekly' | 'monthly' = 'daily',
  ) {
    const cutoff = this.getTimeframeCutoff(timeframe);
    const txs = await this.transactionRepository.find({
      order: { createdAt: 'DESC' },
    });

    const filtered = txs.filter((t) => !cutoff || t.createdAt >= cutoff);

    const map = new Map<
      string,
      {
        receiverId: string;
        totalCoins: number;
        totalGifts: number;
        totalDiamonds: number;
      }
    >();

    for (const t of filtered) {
      const key = t.receiverId;
      const existing = map.get(key) || {
        receiverId: t.receiverId,
        totalCoins: 0,
        totalGifts: 0,
        totalDiamonds: 0,
      };
      existing.totalCoins += t.totalCoins;
      existing.totalGifts += t.quantity;
      existing.totalDiamonds += t.creatorEarnings;
      map.set(key, existing);
    }

    return Array.from(map.values())
      .sort((a, b) => b.totalCoins - a.totalCoins)
      .slice(0, 20);
  }

  async getGiftRevenue(
    timeframe: 'hourly' | 'daily' | 'weekly' | 'monthly' = 'daily',
  ) {
    const cutoff = this.getTimeframeCutoff(timeframe);
    const txs = await this.transactionRepository.find();
    const filtered = txs.filter((t) => !cutoff || t.createdAt >= cutoff);

    let totalCoins = 0;
    let totalCreatorPayouts = 0;
    let totalAgencyPayouts = 0;

    for (const t of filtered) {
      totalCoins += t.totalCoins;
      totalCreatorPayouts += t.creatorEarnings;
      totalAgencyPayouts += t.agencyEarnings;
    }

    const platformNetRevenue =
      totalCoins - totalCreatorPayouts - totalAgencyPayouts;

    return {
      timeframe,
      totalTransactions: filtered.length,
      totalCoinsVolume: totalCoins,
      totalCreatorPayouts,
      totalAgencyPayouts,
      platformNetRevenue: Math.max(0, platformNetRevenue),
      timestamp: new Date().toISOString(),
    };
  }

  async getGiftTrends(
    timeframe: 'hourly' | 'daily' | 'weekly' | 'monthly' = 'daily',
  ) {
    const txs = await this.transactionRepository.find({
      order: { createdAt: 'ASC' },
    });

    const buckets = new Map<
      string,
      { label: string; coins: number; count: number }
    >();

    for (const t of txs) {
      const label = this.getBucketLabel(t.createdAt, timeframe);
      const existing = buckets.get(label) || { label, coins: 0, count: 0 };
      existing.coins += t.totalCoins;
      existing.count += t.quantity;
      buckets.set(label, existing);
    }

    return {
      timeframe,
      data: Array.from(buckets.values()),
    };
  }

  private getTimeframeCutoff(timeframe: string): Date | null {
    const now = new Date();
    if (timeframe === 'hourly') return new Date(now.getTime() - 3600 * 1000);
    if (timeframe === 'daily')
      return new Date(now.getTime() - 24 * 3600 * 1000);
    if (timeframe === 'weekly')
      return new Date(now.getTime() - 7 * 24 * 3600 * 1000);
    if (timeframe === 'monthly')
      return new Date(now.getTime() - 30 * 24 * 3600 * 1000);
    return null;
  }

  private getBucketLabel(date: Date, timeframe: string): string {
    const d = new Date(date);
    if (timeframe === 'hourly') return `${d.getHours()}:00`;
    if (timeframe === 'daily') return `${d.getMonth() + 1}/${d.getDate()}`;
    if (timeframe === 'weekly')
      return `W${Math.ceil(d.getDate() / 7)}-${d.getMonth() + 1}`;
    return `${d.getFullYear()}-${d.getMonth() + 1}`;
  }
}
