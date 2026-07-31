import { Injectable, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ReferralRelationship,
  ReferralCampaign,
  ReferralReward,
  ReferralFraudLog,
  ReferralBlacklist,
} from '../entities';
import { QualificationStatus, FraudStatus } from '../enums/referral.enums';
import { RedisService } from '../../../redis/redis.service';

@Injectable()
export class ReferralAnalyticsService {
  constructor(
    @InjectRepository(ReferralRelationship)
    private readonly relationshipRepository: Repository<ReferralRelationship>,
    @InjectRepository(ReferralCampaign)
    private readonly campaignRepository: Repository<ReferralCampaign>,
    @InjectRepository(ReferralReward)
    private readonly rewardRepository: Repository<ReferralReward>,
    @InjectRepository(ReferralFraudLog)
    private readonly fraudLogRepository: Repository<ReferralFraudLog>,
    @InjectRepository(ReferralBlacklist)
    private readonly blacklistRepository: Repository<ReferralBlacklist>,
    @Optional() private readonly redisService?: RedisService,
  ) {}

  async getAnalyticsSummary() {
    const cacheKey = 'referral:analytics:summary';
    if (this.redisService) {
      const cached = await this.redisService.get(cacheKey);
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch {
          // fallback
        }
      }
    }

    const totalReferrals = await this.relationshipRepository.count();

    const successfulReferrals = await this.relationshipRepository.count({
      where: { qualificationStatus: QualificationStatus.QUALIFIED },
    });

    const pendingReferrals = await this.relationshipRepository.count({
      where: { qualificationStatus: QualificationStatus.PENDING },
    });

    const rejectedReferrals = await this.relationshipRepository.count({
      where: { qualificationStatus: QualificationStatus.REJECTED },
    });

    const rewards = await this.rewardRepository.find();
    let totalCoinsGranted = 0;
    let totalDiamondsGranted = 0;
    let totalXpGranted = 0;
    let totalVipDaysGranted = 0;
    let totalItemsGranted = 0;

    rewards.forEach((r) => {
      if (r.rewardType === 'COINS') totalCoinsGranted += r.amount;
      if (r.rewardType === 'DIAMONDS') totalDiamondsGranted += r.amount;
      if (r.rewardType === 'XP') totalXpGranted += r.amount;
      if (r.rewardType === 'VIP_TRIAL') totalVipDaysGranted += r.amount;
      if (
        r.rewardType === 'STORE_ITEM' ||
        r.rewardType === 'PROFILE_FRAME' ||
        r.rewardType === 'CHAT_BUBBLE' ||
        r.rewardType === 'ENTRANCE_EFFECT'
      ) {
        totalItemsGranted += 1;
      }
    });

    const totalFraudLogs = await this.fraudLogRepository.count();
    const confirmedFraudCount = await this.relationshipRepository.count({
      where: { fraudStatus: FraudStatus.CONFIRMED },
    });
    const blacklistedCount = await this.blacklistRepository.count();

    // Country distribution
    const countryRaw = await this.relationshipRepository
      .createQueryBuilder('rel')
      .select('rel.country', 'country')
      .addSelect('COUNT(rel.id)', 'count')
      .where('rel.country IS NOT NULL')
      .groupBy('rel.country')
      .orderBy('"count"', 'DESC')
      .limit(10)
      .getRawMany();

    const countryWiseReferrals = countryRaw.map((r) => ({
      country: r.country,
      count: parseInt(r.count, 10),
    }));

    // Active campaigns count
    const activeCampaignsCount = await this.campaignRepository.count({
      where: { isActive: true },
    });

    const summary = {
      overview: {
        totalReferrals,
        successfulReferrals,
        pendingReferrals,
        rejectedReferrals,
        conversionRate:
          totalReferrals > 0
            ? Math.round((successfulReferrals / totalReferrals) * 100)
            : 0,
      },
      rewardDistribution: {
        totalCoinsGranted,
        totalDiamondsGranted,
        totalXpGranted,
        totalVipDaysGranted,
        totalItemsGranted,
        totalRewardsGranted: rewards.length,
      },
      fraudStatistics: {
        totalFraudLogs,
        confirmedFraudCount,
        blacklistedCount,
      },
      campaignPerformance: {
        activeCampaignsCount,
      },
      countryWiseReferrals,
    };

    if (this.redisService) {
      await this.redisService.set(cacheKey, JSON.stringify(summary), 300);
    }

    return summary;
  }
}
