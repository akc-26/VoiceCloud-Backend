import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
  Inject,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import {
  ReferralCode,
  ReferralRelationship,
  ReferralReward,
  ReferralMilestone,
  UserReferralMilestone,
} from '../entities';
import {
  ActivationStatus,
  QualificationStatus,
  RewardStatus,
  FraudStatus,
  RewardType,
  RewardTrigger,
} from '../enums/referral.enums';
import { ApplyReferralCodeDto, ReferralQueryDto, GrantRewardDto } from '../dto';
import { RedisService } from '../../../redis/redis.service';
import { QueueService } from '../../../queue/queue.service';
import { EventsGateway } from '../../../common/events/events.gateway';
import { WalletService } from '../../wallet/wallet.service';
import { VipService } from '../../vip/vip.service';
import { StoreService } from '../../store/store.service';
import { ReferralFraudService } from './referral-fraud.service';
import { ReferralCampaignService } from './referral-campaign.service';
import { WalletBalanceType } from '../../../common/enums';
import * as crypto from 'crypto';

@Injectable()
export class ReferralService {
  private readonly logger = new Logger(ReferralService.name);

  constructor(
    @InjectRepository(ReferralCode)
    private readonly referralCodeRepository: Repository<ReferralCode>,
    @InjectRepository(ReferralRelationship)
    private readonly relationshipRepository: Repository<ReferralRelationship>,
    @InjectRepository(ReferralReward)
    private readonly rewardRepository: Repository<ReferralReward>,
    @InjectRepository(ReferralMilestone)
    private readonly milestoneRepository: Repository<ReferralMilestone>,
    @InjectRepository(UserReferralMilestone)
    private readonly userMilestoneRepository: Repository<UserReferralMilestone>,
    private readonly dataSource: DataSource,
    private readonly referralFraudService: ReferralFraudService,
    private readonly referralCampaignService: ReferralCampaignService,
    private readonly eventsGateway: EventsGateway,
    @Optional() private readonly redisService?: RedisService,
    @Optional() private readonly queueService?: QueueService,
    @Optional() private readonly walletService?: WalletService,
    @Optional() private readonly vipService?: VipService,
    @Optional() private readonly storeService?: StoreService,
  ) {}

  /**
   * Helper: Generate unique random code
   */
  private generateRandomCode(): string {
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `REF-${randomHex}`;
  }

  /**
   * 1. Get or Create User Referral Code
   */
  async getOrCreateUserReferralCode(
    userId: string,
    customCode?: string,
  ): Promise<ReferralCode> {
    const cacheKey = `referral:code:user:${userId}`;
    if (this.redisService) {
      const cached = await this.redisService.get(cacheKey);
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch {
          // parse error fallback
        }
      }
    }

    let userCode = await this.referralCodeRepository.findOne({
      where: { userId },
    });

    if (customCode) {
      const formattedCustom = customCode.trim().toUpperCase();
      const existing = await this.referralCodeRepository.findOne({
        where: { referralCode: formattedCustom },
      });
      if (existing && existing.userId !== userId) {
        throw new ConflictException('Custom referral code is already in use');
      }

      if (userCode) {
        userCode.referralCode = formattedCustom;
        userCode.isCustom = true;
      } else {
        userCode = this.referralCodeRepository.create({
          userId,
          referralCode: formattedCustom,
          isCustom: true,
          usageCount: 0,
          isActive: true,
        });
      }
      userCode = await this.referralCodeRepository.save(userCode);
    } else if (!userCode) {
      let uniqueCode = this.generateRandomCode();
      let attempts = 0;
      while (
        await this.referralCodeRepository.findOne({
          where: { referralCode: uniqueCode },
        })
      ) {
        uniqueCode = this.generateRandomCode();
        attempts++;
        if (attempts > 10) break;
      }

      userCode = this.referralCodeRepository.create({
        userId,
        referralCode: uniqueCode,
        isCustom: false,
        usageCount: 0,
        isActive: true,
      });
      userCode = await this.referralCodeRepository.save(userCode);
    }

    if (this.redisService && userCode) {
      await this.redisService.set(
        cacheKey,
        JSON.stringify(userCode),
        600,
      );
      await this.redisService.set(
        `referral:code:str:${userCode.referralCode}`,
        userId,
        600,
      );
    }

    return userCode;
  }

  /**
   * 2. Get User Referral Summary
   */
  async getReferralSummary(userId: string) {
    const cacheKey = `referral:summary:${userId}`;
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

    const referralCode = await this.getOrCreateUserReferralCode(userId);

    const totalReferrals = await this.relationshipRepository.count({
      where: { referrerId: userId },
    });

    const qualifiedReferrals = await this.relationshipRepository.count({
      where: {
        referrerId: userId,
        qualificationStatus: QualificationStatus.QUALIFIED,
      },
    });

    const pendingReferrals = await this.relationshipRepository.count({
      where: {
        referrerId: userId,
        qualificationStatus: QualificationStatus.PENDING,
      },
    });

    const rewards = await this.rewardRepository.find({
      where: { referrerId: userId },
    });

    let totalCoinsEarned = 0;
    let totalDiamondsEarned = 0;
    rewards.forEach((r) => {
      if (r.rewardType === RewardType.COINS) totalCoinsEarned += r.amount;
      if (r.rewardType === RewardType.DIAMONDS) totalDiamondsEarned += r.amount;
    });

    const milestones = await this.getReferralMilestones(userId);

    const summary = {
      userId,
      referralCode: referralCode.referralCode,
      isCustomCode: referralCode.isCustom,
      usageCount: referralCode.usageCount,
      shareUrl: `https://voicecloud.app/invite?code=${referralCode.referralCode}`,
      statistics: {
        totalReferrals,
        qualifiedReferrals,
        pendingReferrals,
        totalCoinsEarned,
        totalDiamondsEarned,
      },
      nextMilestone:
        milestones.find((m) => !m.unlocked) || null,
    };

    if (this.redisService) {
      await this.redisService.set(cacheKey, JSON.stringify(summary), 300);
    }

    return summary;
  }

  /**
   * 3. Apply Referral Code
   */
  async applyReferralCode(referredUserId: string, dto: ApplyReferralCodeDto) {
    const cleanCode = dto.referralCode.trim().toUpperCase();

    // Find referrer code record
    const codeRecord = await this.referralCodeRepository.findOne({
      where: { referralCode: cleanCode, isActive: true },
    });

    if (!codeRecord) {
      throw new NotFoundException('Invalid or inactive referral code');
    }

    const referrerId = codeRecord.userId;

    // 1. Self Referral Check
    if (referrerId === referredUserId) {
      throw new BadRequestException('You cannot refer yourself');
    }

    // 2. Duplicate Referral Check
    const existingRelationship = await this.relationshipRepository.findOne({
      where: { referredUserId },
    });
    if (existingRelationship) {
      throw new ConflictException(
        'You have already applied a referral code or were previously referred',
      );
    }

    // 3. Circular Referral Check
    const circularCheck = await this.relationshipRepository.findOne({
      where: { referrerId: referredUserId, referredUserId: referrerId },
    });
    if (circularCheck) {
      throw new BadRequestException(
        'Circular referral chains are strictly forbidden',
      );
    }

    // 4. Blacklist Check
    const isBlacklisted = await this.referralFraudService.checkBlacklist(
      referredUserId,
      dto.ipAddress,
      dto.deviceId,
    );
    if (isBlacklisted) {
      throw new BadRequestException(
        'Referral code application rejected due to security policy',
      );
    }

    // 5. Active Campaign Check
    const activeCampaign =
      await this.referralCampaignService.getMatchingCampaign(dto.country);

    let fraudStatus = FraudStatus.CLEAN;
    let qualificationStatus = QualificationStatus.PENDING;

    // 6. Fraud Analysis Check
    const fraudResult = await this.referralFraudService.analyzeReferralFraud(
      referrerId,
      referredUserId,
      dto.ipAddress,
      dto.deviceId,
    );

    if (fraudResult.isFraud) {
      fraudStatus = FraudStatus.SUSPECTED;
    }

    // Create Relationship
    const relationship = this.relationshipRepository.create({
      referrerId,
      referredUserId,
      referralCode: cleanCode,
      registrationDate: new Date(),
      activationStatus: ActivationStatus.ACTIVE,
      qualificationStatus,
      rewardStatus: RewardStatus.UNCLAIMED,
      fraudStatus,
      campaignId: activeCampaign ? activeCampaign.id : null,
      ipAddress: dto.ipAddress || null,
      deviceId: dto.deviceId || null,
      country: dto.country || null,
    });

    const savedRel = await this.relationshipRepository.save(relationship);

    // Increment Code Usage
    codeRecord.usageCount += 1;
    await this.referralCodeRepository.save(codeRecord);

    // Auto Grant Registration Trigger Rewards if CLEAN
    if (fraudStatus === FraudStatus.CLEAN) {
      await this.processRewardTriggers(
        savedRel.id,
        RewardTrigger.REGISTRATION,
      );
    }

    // Check & Process Milestones for Referrer
    await this.checkAndUpdateMilestones(referrerId);

    // Clear summary caches
    if (this.redisService) {
      await this.redisService.del(`referral:summary:${referrerId}`);
      await this.redisService.del(`referral:summary:${referredUserId}`);
      await this.redisService.del('referral:leaderboard');
    }

    // Queue Background Processing Job
    if (this.queueService) {
      try {
        await this.queueService.addReferralJob('validate-referral', {
          relationshipId: savedRel.id,
          referrerId,
          referredUserId,
        });
      } catch (err) {
        this.logger.warn(`Failed to queue referral validation job: ${err}`);
      }
    }

    // WebSocket Emission
    this.eventsGateway.broadcastToRoom(
      referrerId,
      'referral_created',
      {
        relationshipId: savedRel.id,
        referredUserId,
        referralCode: cleanCode,
        status: savedRel.qualificationStatus,
      },
    );

    return {
      success: true,
      relationship: savedRel,
      message: 'Referral code applied successfully',
    };
  }

  /**
   * 4. Process Reward Triggers (e.g. REGISTRATION, FIRST_LOGIN, FIRST_VOICE_ROOM_JOIN, FIRST_GIFT_PURCHASE, FIRST_WALLET_PURCHASE, VIP_PURCHASE)
   */
  async processRewardTriggers(
    relationshipId: string,
    trigger: RewardTrigger,
  ) {
    const rel = await this.relationshipRepository.findOne({
      where: { id: relationshipId },
    });
    if (!rel) return;

    if (rel.fraudStatus === FraudStatus.CONFIRMED) {
      this.logger.warn(
        `Skipping rewards for relationship ${relationshipId} due to confirmed fraud`,
      );
      return;
    }

    let campaign = null;
    if (rel.campaignId) {
      campaign = await this.referralCampaignService.getCampaignById(
        rel.campaignId,
      );
    }

    // Default system rewards if no active campaign overrides
    const defaultConfigs = campaign?.rewardConfiguration?.length
      ? campaign.rewardConfiguration
      : [
          {
            triggerEvent: RewardTrigger.REGISTRATION,
            rewardType: RewardType.COINS,
            amount: 100,
            target: 'BOTH',
          },
          {
            triggerEvent: RewardTrigger.FIRST_LOGIN,
            rewardType: RewardType.COINS,
            amount: 50,
            target: 'REFERRED',
          },
          {
            triggerEvent: RewardTrigger.FIRST_GIFT_PURCHASE,
            rewardType: RewardType.DIAMONDS,
            amount: 20,
            target: 'REFERRER',
          },
        ];

    const matchingConfigs = defaultConfigs.filter(
      (c) => c.triggerEvent === trigger,
    );

    for (const config of matchingConfigs) {
      const target = config.target || 'REFERRER';

      if (target === 'REFERRER' || target === 'BOTH') {
        await this.grantRewardToUser({
          relationshipId: rel.id,
          userId: rel.referrerId,
          referredUserId: rel.referredUserId,
          campaignId: rel.campaignId,
          rewardType: config.rewardType || RewardType.COINS,
          amount: config.amount || 100,
          itemId: config.itemId || null,
          triggerEvent: trigger,
        });
      }

      if (target === 'REFERRED' || target === 'BOTH') {
        await this.grantRewardToUser({
          relationshipId: rel.id,
          userId: rel.referredUserId,
          referredUserId: rel.referredUserId,
          campaignId: rel.campaignId,
          rewardType: config.rewardType || RewardType.COINS,
          amount: config.amount || 50,
          itemId: config.itemId || null,
          triggerEvent: trigger,
        });
      }
    }

    // Update relationship qualification & reward status
    rel.qualificationStatus = QualificationStatus.QUALIFIED;
    rel.rewardStatus = RewardStatus.GRANTED;
    await this.relationshipRepository.save(rel);
  }

  /**
   * Helper: Grant Reward To User & integrate with Wallet / VIP / Store
   */
  async grantRewardToUser(params: {
    relationshipId?: string | null;
    userId: string;
    referredUserId?: string | null;
    campaignId?: string | null;
    rewardType: RewardType;
    amount: number;
    itemId?: string | null;
    triggerEvent: RewardTrigger;
    reason?: string;
  }) {
    const reward = this.rewardRepository.create({
      relationshipId: params.relationshipId || null,
      referrerId: params.userId,
      referredUserId: params.referredUserId || null,
      campaignId: params.campaignId || null,
      rewardType: params.rewardType,
      amount: params.amount,
      itemId: params.itemId || null,
      triggerEvent: params.triggerEvent,
      status: RewardStatus.GRANTED,
      claimedAt: new Date(),
      metadata: { reason: params.reason || 'Referral System Reward' },
    });

    const savedReward = await this.rewardRepository.save(reward);

    // Execute Module Integration
    try {
      if (
        params.rewardType === RewardType.COINS &&
        this.walletService
      ) {
        await this.walletService.creditWallet({
          userId: params.userId,
          amount: params.amount,
          balanceType: WalletBalanceType.COIN,
          remarks: `Referral Reward (${params.triggerEvent})`,
        });
      } else if (
        params.rewardType === RewardType.DIAMONDS &&
        this.walletService
      ) {
        await this.walletService.creditWallet({
          userId: params.userId,
          amount: params.amount,
          balanceType: WalletBalanceType.DIAMOND,
          remarks: `Referral Reward (${params.triggerEvent})`,
        });
      } else if (
        params.rewardType === RewardType.BONUS_COINS &&
        this.walletService
      ) {
        await this.walletService.creditWallet({
          userId: params.userId,
          amount: params.amount,
          balanceType: WalletBalanceType.BONUS,
          remarks: `Referral Reward (${params.triggerEvent})`,
        });
      } else if (
        params.rewardType === RewardType.VIP_TRIAL &&
        this.vipService
      ) {
        const tiers = await this.vipService.findAllTiers();
        const tierId = tiers[0]?.id || 'vip-1';
        await this.vipService.subscribe(params.userId, { tierId });
      } else if (
        (params.rewardType === RewardType.STORE_ITEM ||
          params.rewardType === RewardType.PROFILE_FRAME ||
          params.rewardType === RewardType.CHAT_BUBBLE ||
          params.rewardType === RewardType.ENTRANCE_EFFECT) &&
        this.storeService &&
        params.itemId
      ) {
        await this.storeService.grantInventoryItem({
          userId: params.userId,
          itemId: params.itemId,
          durationDays: 30,
          reason: `Referral Reward (${params.triggerEvent})`,
        });
      }
    } catch (error) {
      this.logger.error(
        `Error granting module reward for user ${params.userId}: ${error}`,
      );
    }

    // Broadcast WebSocket event
    this.eventsGateway.broadcastToRoom(
      params.userId,
      'referral_reward_granted',
      {
        rewardId: savedReward.id,
        rewardType: params.rewardType,
        amount: params.amount,
        triggerEvent: params.triggerEvent,
      },
    );

    return savedReward;
  }

  /**
   * 5. Referral Milestones Check & Progress
   */
  async checkAndUpdateMilestones(userId: string) {
    const referralCount = await this.relationshipRepository.count({
      where: {
        referrerId: userId,
        qualificationStatus: QualificationStatus.QUALIFIED,
      },
    });

    const activeMilestones = await this.milestoneRepository.find({
      where: { isActive: true },
    });

    for (const milestone of activeMilestones) {
      if (referralCount >= milestone.requiredCount) {
        const existingUnlock = await this.userMilestoneRepository.findOne({
          where: { userId, milestoneId: milestone.id },
        });

        if (!existingUnlock) {
          const newUnlock = this.userMilestoneRepository.create({
            userId,
            milestoneId: milestone.id,
            unlockedAt: new Date(),
          });
          await this.userMilestoneRepository.save(newUnlock);

          // Auto Grant Milestone Reward
          await this.grantRewardToUser({
            userId,
            rewardType: milestone.rewardType,
            amount: milestone.amount,
            itemId: milestone.itemId,
            triggerEvent: RewardTrigger.MILESTONE_REFERRALS,
            reason: `Milestone Unlocked: ${milestone.title}`,
          });

          // Broadcast WS event
          this.eventsGateway.broadcastToRoom(
            userId,
            'milestone_unlocked',
            {
              milestoneId: milestone.id,
              title: milestone.title,
              requiredCount: milestone.requiredCount,
              rewardType: milestone.rewardType,
              amount: milestone.amount,
            },
          );
        }
      }
    }
  }

  /**
   * 6. Get User Referral History
   */
  async getReferralHistory(userId: string, query: ReferralQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.relationshipRepository.createQueryBuilder('rel');
    qb.where('rel.referrerId = :userId', { userId });

    if (query.status) {
      qb.andWhere('rel.qualificationStatus = :status', { status: query.status });
    }

    qb.orderBy('rel.registrationDate', 'DESC');
    qb.skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 7. Get Referral Rewards List
   */
  async getReferralRewards(userId: string) {
    return this.rewardRepository.find({
      where: { referrerId: userId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 8. Get Referral Milestones List
   */
  async getReferralMilestones(userId: string) {
    let milestones = await this.milestoneRepository.find({
      where: { isActive: true },
      order: { requiredCount: 'ASC' },
    });

    if (milestones.length === 0) {
      // Seed default milestones if empty
      const defaultMilestones = [
        { title: '1 Referral', requiredCount: 1, rewardType: RewardType.COINS, amount: 100 },
        { title: '5 Referrals', requiredCount: 5, rewardType: RewardType.COINS, amount: 600 },
        { title: '10 Referrals', requiredCount: 10, rewardType: RewardType.DIAMONDS, amount: 100 },
        { title: '25 Referrals', requiredCount: 25, rewardType: RewardType.VIP_TRIAL, amount: 7 },
        { title: '50 Referrals', requiredCount: 50, rewardType: RewardType.DIAMONDS, amount: 500 },
        { title: '100 Referrals', requiredCount: 100, rewardType: RewardType.PROFILE_FRAME, amount: 1, itemId: 'frame_gold_referral' },
      ];
      for (const m of defaultMilestones) {
        const created = this.milestoneRepository.create(m);
        await this.milestoneRepository.save(created);
      }
      milestones = await this.milestoneRepository.find({
        where: { isActive: true },
        order: { requiredCount: 'ASC' },
      });
    }

    const userUnlocked = await this.userMilestoneRepository.find({
      where: { userId },
    });
    const unlockedMap = new Set(userUnlocked.map((u) => u.milestoneId));

    const totalQualified = await this.relationshipRepository.count({
      where: {
        referrerId: userId,
        qualificationStatus: QualificationStatus.QUALIFIED,
      },
    });

    return milestones.map((m) => ({
      ...m,
      unlocked: unlockedMap.has(m.id),
      progress: Math.min(totalQualified, m.requiredCount),
    }));
  }

  /**
   * 9. Get Referral Leaderboard
   */
  async getLeaderboard(limit = 50) {
    const cacheKey = 'referral:leaderboard';
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

    const qb = this.relationshipRepository.createQueryBuilder('rel');
    qb.select('rel.referrerId', 'userId');
    qb.addSelect('COUNT(rel.id)', 'referralCount');
    qb.where('rel.qualificationStatus = :status', {
      status: QualificationStatus.QUALIFIED,
    });
    qb.groupBy('rel.referrerId');
    qb.orderBy('"referralCount"', 'DESC');
    qb.limit(limit);

    const rawResults = await qb.getRawMany();

    const leaderboard = rawResults.map((row, index) => ({
      rank: index + 1,
      userId: row.userId,
      referralCount: parseInt(row.referralCount, 10),
    }));

    if (this.redisService) {
      await this.redisService.set(
        cacheKey,
        JSON.stringify(leaderboard),
        300,
      );
    }

    return leaderboard;
  }

  /**
   * 10. Manual Admin Grant Reward
   */
  async manualGrantReward(dto: GrantRewardDto) {
    const reward = await this.grantRewardToUser({
      userId: dto.userId,
      rewardType: dto.rewardType,
      amount: dto.amount,
      itemId: dto.itemId,
      triggerEvent: RewardTrigger.MILESTONE_REFERRALS,
      reason: dto.reason || 'Admin Manual Grant',
    });

    return {
      success: true,
      reward,
      message: 'Reward granted successfully',
    };
  }

  /**
   * 11. Admin Manual Referral Approval
   */
  async manualApproveReferral(relationshipId: string) {
    const rel = await this.relationshipRepository.findOne({
      where: { id: relationshipId },
    });
    if (!rel) {
      throw new NotFoundException('Referral relationship not found');
    }

    rel.qualificationStatus = QualificationStatus.QUALIFIED;
    rel.fraudStatus = FraudStatus.CLEAN;
    rel.rewardStatus = RewardStatus.GRANTED;
    await this.relationshipRepository.save(rel);

    await this.processRewardTriggers(
      rel.id,
      RewardTrigger.REGISTRATION,
    );
    await this.checkAndUpdateMilestones(rel.referrerId);

    this.eventsGateway.broadcastToRoom(
      rel.referrerId,
      'referral_verified',
      {
        relationshipId: rel.id,
        referredUserId: rel.referredUserId,
        status: QualificationStatus.QUALIFIED,
      },
    );

    return { success: true, relationship: rel };
  }
}
