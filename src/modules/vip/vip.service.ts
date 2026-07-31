import {
  Injectable,
  NotFoundException,
  BadRequestException,
  OnModuleInit,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  VipTier,
  VipMembership,
  VipBenefit,
  VipReward,
  VipRewardClaim,
  VipTransaction,
  VipStatus,
  SubscriptionCycle,
  VipRewardType,
} from './entities';
import { Gift } from '../gifts/entities/gift.entity';
import { SubscribeVipDto } from './dto/subscribe-vip.dto';
import { RenewVipDto } from './dto/renew-vip.dto';
import { UpgradeDowngradeVipDto } from './dto/upgrade-downgrade-vip.dto';
import { CreateVipTierDto } from './dto/create-vip-tier.dto';
import { UpdateVipTierDto } from './dto/update-vip-tier.dto';
import { CreateVipBenefitDto } from './dto/create-vip-benefit.dto';
import { CreateVipRewardDto } from './dto/create-vip-reward.dto';
import { EventsGateway } from '../../common/events/events.gateway';
import { RedisService } from '../../redis/redis.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { VIP_REDIS_KEYS, DEFAULT_VIP_BENEFITS } from './vip.constants';

@Injectable()
export class VipService implements OnModuleInit {
  private readonly logger = new Logger(VipService.name);

  constructor(
    @InjectRepository(VipTier)
    private readonly tierRepository: Repository<VipTier>,
    @InjectRepository(VipMembership)
    private readonly membershipRepository: Repository<VipMembership>,
    @InjectRepository(VipBenefit)
    private readonly benefitRepository: Repository<VipBenefit>,
    @InjectRepository(VipReward)
    private readonly rewardRepository: Repository<VipReward>,
    @InjectRepository(VipRewardClaim)
    private readonly claimRepository: Repository<VipRewardClaim>,
    @InjectRepository(VipTransaction)
    private readonly transactionRepository: Repository<VipTransaction>,
    @InjectRepository(Gift)
    private readonly giftRepository: Repository<Gift>,
    private readonly eventsGateway: EventsGateway,
    private readonly redisService: RedisService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async onModuleInit() {
    await this.seedDefaultTiers();
    await this.seedDefaultBenefits();
    await this.seedDefaultRewards();
  }

  // Seeding Default Tiers (VIP 1 to VIP 10)
  async seedDefaultTiers() {
    const count = await this.tierRepository.count();
    if (count === 0) {
      this.logger.log('Seeding default VIP Tiers (VIP 1 to VIP 10)...');
      const tierTemplates = [
        {
          level: 1,
          name: 'VIP 1 Silver',
          badge: 'Silver Badge',
          colorTheme: '#C0C0C0',
          monthlyPrice: 9.99,
          quarterlyPrice: 26.99,
          yearlyPrice: 99.99,
        },
        {
          level: 2,
          name: 'VIP 2 Gold',
          badge: 'Gold Crown',
          colorTheme: '#FFD700',
          monthlyPrice: 19.99,
          quarterlyPrice: 53.99,
          yearlyPrice: 199.99,
        },
        {
          level: 3,
          name: 'VIP 3 Platinum',
          badge: 'Platinum Crest',
          colorTheme: '#E5E4E2',
          monthlyPrice: 39.99,
          quarterlyPrice: 107.99,
          yearlyPrice: 399.99,
        },
        {
          level: 4,
          name: 'VIP 4 Diamond',
          badge: 'Diamond Aura',
          colorTheme: '#B9F2FF',
          monthlyPrice: 79.99,
          quarterlyPrice: 215.99,
          yearlyPrice: 799.99,
        },
        {
          level: 5,
          name: 'VIP 5 Crown',
          badge: 'Imperial Crown',
          colorTheme: '#9370DB',
          monthlyPrice: 149.99,
          quarterlyPrice: 399.99,
          yearlyPrice: 1499.99,
        },
        {
          level: 6,
          name: 'VIP 6 Monarch',
          badge: 'Monarch Scepter',
          colorTheme: '#FF4500',
          monthlyPrice: 299.99,
          quarterlyPrice: 799.99,
          yearlyPrice: 2999.99,
        },
        {
          level: 7,
          name: 'VIP 7 Sovereign',
          badge: 'Sovereign Wings',
          colorTheme: '#DC143C',
          monthlyPrice: 499.99,
          quarterlyPrice: 1349.99,
          yearlyPrice: 4999.99,
        },
        {
          level: 8,
          name: 'VIP 8 Imperial',
          badge: 'Imperial Dragon',
          colorTheme: '#FF1493',
          monthlyPrice: 899.99,
          quarterlyPrice: 2399.99,
          yearlyPrice: 8999.99,
        },
        {
          level: 9,
          name: 'VIP 9 Celestial',
          badge: 'Celestial Halo',
          colorTheme: '#00FFFF',
          monthlyPrice: 1499.99,
          quarterlyPrice: 3999.99,
          yearlyPrice: 14999.99,
        },
        {
          level: 10,
          name: 'VIP 10 Supreme',
          badge: 'Supreme Universe',
          colorTheme: '#FFD700',
          monthlyPrice: 2499.99,
          quarterlyPrice: 6699.99,
          yearlyPrice: 24999.99,
        },
      ];

      for (const t of tierTemplates) {
        const tier = this.tierRepository.create({
          name: t.name,
          level: t.level,
          badge: t.badge,
          badgeUrl: `https://cdn.voicecloud.app/badges/vip_${t.level}.png`,
          icon: `https://cdn.voicecloud.app/icons/vip_${t.level}.png`,
          colorTheme: t.colorTheme,
          monthlyPrice: t.monthlyPrice,
          quarterlyPrice: t.quarterlyPrice,
          yearlyPrice: t.yearlyPrice,
          price: t.monthlyPrice,
          durationDays: 30,
          benefits: [
            'animated_profile_frame',
            'exclusive_badge',
            'vip_name_color',
          ],
          activationStatus: true,
          isActive: true,
          description: `Tier ${t.level} VIP Membership with exclusive privileges`,
          sortOrder: t.level,
        });
        await this.tierRepository.save(tier);
      }
      this.logger.log('VIP Tiers 1-10 seeded successfully.');
    }
  }

  // Seeding Default Benefits
  async seedDefaultBenefits() {
    const count = await this.benefitRepository.count();
    if (count === 0) {
      this.logger.log('Seeding default VIP Benefits catalog...');
      for (const b of DEFAULT_VIP_BENEFITS) {
        const benefit = this.benefitRepository.create({
          key: b.key,
          name: b.name,
          description: b.description,
          category: b.category,
          minVipLevel: b.minVipLevel,
          metadata: b.metadata,
          iconUrl: `https://cdn.voicecloud.app/benefits/${b.key}.png`,
          isActive: true,
        });
        await this.benefitRepository.save(benefit);
      }
      this.logger.log('VIP Benefits catalog seeded successfully.');
    }
  }

  // Seeding Default Rewards
  async seedDefaultRewards() {
    const count = await this.rewardRepository.count();
    if (count === 0) {
      this.logger.log('Seeding default VIP Daily/Weekly/Monthly Rewards...');
      const rewards = [
        {
          title: 'VIP Daily Check-in Bonus',
          rewardType: VipRewardType.DAILY,
          minVipLevel: 1,
          coins: 50,
          exp: 100,
          iconUrl: 'https://cdn.voicecloud.app/rewards/daily.png',
        },
        {
          title: 'VIP Weekly Bonus Chest',
          rewardType: VipRewardType.WEEKLY,
          minVipLevel: 1,
          coins: 350,
          exp: 500,
          iconUrl: 'https://cdn.voicecloud.app/rewards/weekly.png',
        },
        {
          title: 'VIP Monthly Supreme Box',
          rewardType: VipRewardType.MONTHLY,
          minVipLevel: 1,
          coins: 1500,
          exp: 2000,
          iconUrl: 'https://cdn.voicecloud.app/rewards/monthly.png',
        },
      ];
      for (const r of rewards) {
        const reward = this.rewardRepository.create({
          title: r.title,
          description: `Exclusive ${r.rewardType.toLowerCase()} reward for VIP members`,
          rewardType: r.rewardType,
          minVipLevel: r.minVipLevel,
          coins: r.coins,
          exp: r.exp,
          iconUrl: r.iconUrl,
          isActive: true,
        });
        await this.rewardRepository.save(reward);
      }
      this.logger.log('VIP Rewards seeded successfully.');
    }
  }

  // --- Tier CRUD ---
  async findAllTiers(includeInactive = false): Promise<VipTier[]> {
    const cacheKey = VIP_REDIS_KEYS.ALL_TIERS_CACHE;
    if (!includeInactive) {
      const cached = await this.redisService.get(cacheKey);
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch {
          /* ignore */
        }
      }
    }

    const where = includeInactive ? {} : { activationStatus: true };
    const tiers = await this.tierRepository.find({
      where,
      order: { level: 'ASC' },
    });

    if (!includeInactive) {
      await this.redisService.set(cacheKey, JSON.stringify(tiers), 600);
    }
    return tiers;
  }

  async findAllPlans(includeInactive = false): Promise<VipTier[]> {
    return this.findAllTiers(includeInactive);
  }

  async findTierById(id: string): Promise<VipTier> {
    const tier = await this.tierRepository.findOne({
      where: [{ id }, { name: id }],
    });
    if (!tier) {
      throw new NotFoundException(`VIP Tier with ID or name '${id}' not found`);
    }
    return tier;
  }

  async findPlanById(id: string): Promise<VipTier> {
    return this.findTierById(id);
  }

  async createTier(dto: CreateVipTierDto): Promise<VipTier> {
    const tier = this.tierRepository.create({
      ...dto,
      badge: dto.badge || dto.name,
      badgeUrl:
        dto.badgeUrl ||
        `https://cdn.voicecloud.app/badges/vip_${dto.level}.png`,
      quarterlyPrice: dto.quarterlyPrice || dto.monthlyPrice * 2.7,
      yearlyPrice: dto.yearlyPrice || dto.monthlyPrice * 10,
      price: dto.price || dto.monthlyPrice,
      activationStatus: dto.activationStatus ?? dto.isActive ?? true,
      isActive: dto.activationStatus ?? dto.isActive ?? true,
    });
    const saved = await this.tierRepository.save(tier);
    await this.redisService.del(VIP_REDIS_KEYS.ALL_TIERS_CACHE);
    return saved;
  }

  async createPlan(dto: CreateVipTierDto): Promise<VipTier> {
    return this.createTier(dto);
  }

  async updateTier(id: string, dto: UpdateVipTierDto): Promise<VipTier> {
    const tier = await this.findTierById(id);
    Object.assign(tier, dto);
    if (dto.activationStatus !== undefined)
      tier.isActive = dto.activationStatus;
    if (dto.isActive !== undefined) tier.activationStatus = dto.isActive;
    const saved = await this.tierRepository.save(tier);
    await this.redisService.del(VIP_REDIS_KEYS.ALL_TIERS_CACHE);
    return saved;
  }

  async updatePlan(id: string, dto: UpdateVipTierDto): Promise<VipTier> {
    return this.updateTier(id, dto);
  }

  async deleteTier(id: string): Promise<{ success: boolean }> {
    const tier = await this.findTierById(id);
    await this.tierRepository.remove(tier);
    await this.redisService.del(VIP_REDIS_KEYS.ALL_TIERS_CACHE);
    return { success: true };
  }

  async deletePlan(id: string): Promise<{ success: boolean }> {
    return this.deleteTier(id);
  }

  // --- Subscription Management ---
  async subscribe(
    userId: string,
    dto: SubscribeVipDto,
  ): Promise<VipMembership> {
    const targetId = dto.tierId || dto.planId;
    if (!targetId) {
      throw new BadRequestException('tierId or planId is required');
    }
    const tier = await this.findTierById(targetId);
    if (!tier.activationStatus && !tier.isActive) {
      throw new BadRequestException(
        `VIP Tier '${tier.name}' is currently inactive`,
      );
    }

    const cycle = dto.cycle || SubscriptionCycle.MONTHLY;
    let durationDays = 30;
    let price = Number(tier.monthlyPrice || tier.price || 9.99);

    if (cycle === SubscriptionCycle.QUARTERLY) {
      durationDays = 90;
      price = Number(tier.quarterlyPrice || price * 2.7);
    } else if (cycle === SubscriptionCycle.YEARLY) {
      durationDays = 365;
      price = Number(tier.yearlyPrice || price * 10);
    }

    const now = new Date();
    let membership = await this.membershipRepository.findOne({
      where: { userId },
    });

    const baseDate =
      membership && membership.expiresAt > now ? membership.expiresAt : now;
    const expiresAt = new Date(
      baseDate.getTime() + durationDays * 24 * 60 * 60 * 1000,
    );

    const expEarned = 100 * tier.level * (durationDays / 30);

    if (membership) {
      membership.tierId = tier.id;
      membership.planId = tier.id;
      membership.tierName = tier.name;
      membership.planName = tier.name;
      membership.level = tier.level;
      membership.badgeUrl = tier.badgeUrl || tier.badge || '';
      membership.colorTheme = tier.colorTheme || '#FFD700';
      membership.benefits = tier.benefits || [];
      membership.status = VipStatus.ACTIVE;
      membership.autoRenew = dto.autoRenew ?? true;
      membership.subscriptionCycle = cycle;
      membership.startDate = now;
      membership.expiresAt = expiresAt;
      membership.experience = Number(membership.experience || 0) + expEarned;
      membership.lifetimeSpending =
        Number(membership.lifetimeSpending || 0) + price;
      membership = await this.membershipRepository.save(membership);
    } else {
      membership = this.membershipRepository.create({
        userId,
        tierId: tier.id,
        planId: tier.id,
        tierName: tier.name,
        planName: tier.name,
        level: tier.level,
        badgeUrl: tier.badgeUrl || tier.badge || '',
        colorTheme: tier.colorTheme || '#FFD700',
        benefits: tier.benefits || [],
        status: VipStatus.ACTIVE,
        autoRenew: dto.autoRenew ?? true,
        subscriptionCycle: cycle,
        startDate: now,
        expiresAt,
        experience: expEarned,
        lifetimeSpending: price,
      });
      membership = await this.membershipRepository.save(membership);
    }

    // Record Transaction
    const transaction = this.transactionRepository.create({
      userId,
      tierId: tier.id,
      planId: tier.id,
      tierName: tier.name,
      planName: tier.name,
      amount: price,
      durationDays,
      cycle,
      action: 'SUBSCRIBE',
      status: 'SUCCESS',
    });
    await this.transactionRepository.save(transaction);

    // Invalidate Cache
    await this.redisService.del(VIP_REDIS_KEYS.SESSION_CACHE(userId));
    await this.redisService.del(VIP_REDIS_KEYS.PROGRESS_CACHE(userId));

    // Send Notification
    try {
      await this.notificationsService.createNotification({
        userId,
        title: 'VIP Subscription Activated!',
        message: `Welcome to ${tier.name}! Your VIP benefits are now active.`,
        type: NotificationType.SYSTEM,
        data: {
          tierId: tier.id,
          level: tier.level,
          expiresAt: expiresAt.toISOString(),
        },
      });
    } catch {
      /* ignore notification failure */
    }

    // Broadcast WebSocket Event
    this.eventsGateway.broadcastVipEvent('vip:purchased', {
      userId,
      vip: membership,
    });
    this.eventsGateway.broadcastVipEvent('vip:status_updated', {
      userId,
      status: VipStatus.ACTIVE,
      level: tier.level,
      tierName: tier.name,
    });

    return membership;
  }

  async purchaseVip(userId: string, dto: any): Promise<VipMembership> {
    return this.subscribe(userId, {
      tierId: dto.planId || dto.tierId,
      autoRenew: dto.autoRenew,
      cycle: SubscriptionCycle.MONTHLY,
    });
  }

  async renew(userId: string, dto: RenewVipDto): Promise<VipMembership> {
    const current = await this.membershipRepository.findOne({
      where: { userId },
    });
    if (!current) {
      throw new NotFoundException(
        'No existing VIP membership record found to renew',
      );
    }

    const tierId = dto?.tierId || dto?.planId || current.tierId;
    const tier = await this.findTierById(tierId);

    const cycle =
      dto?.cycle || current.subscriptionCycle || SubscriptionCycle.MONTHLY;
    let durationDays = 30;
    let price = Number(tier.monthlyPrice || tier.price || 9.99);

    if (cycle === SubscriptionCycle.QUARTERLY) {
      durationDays = 90;
      price = Number(tier.quarterlyPrice || price * 2.7);
    } else if (cycle === SubscriptionCycle.YEARLY) {
      durationDays = 365;
      price = Number(tier.yearlyPrice || price * 10);
    }

    const now = new Date();
    const baseDate = current.expiresAt > now ? current.expiresAt : now;
    const newExpiresAt = new Date(
      baseDate.getTime() + durationDays * 24 * 60 * 60 * 1000,
    );

    current.tierId = tier.id;
    current.planId = tier.id;
    current.tierName = tier.name;
    current.planName = tier.name;
    current.level = tier.level;
    current.badgeUrl = tier.badgeUrl || current.badgeUrl;
    current.colorTheme = tier.colorTheme || current.colorTheme;
    current.benefits = tier.benefits || current.benefits;
    current.status = VipStatus.ACTIVE;
    current.subscriptionCycle = cycle;
    current.expiresAt = newExpiresAt;
    current.lifetimeSpending = Number(current.lifetimeSpending || 0) + price;

    const updated = await this.membershipRepository.save(current);

    const transaction = this.transactionRepository.create({
      userId,
      tierId: tier.id,
      planId: tier.id,
      tierName: tier.name,
      planName: tier.name,
      amount: price,
      durationDays,
      cycle,
      action: 'RENEW',
      status: 'SUCCESS',
    });
    await this.transactionRepository.save(transaction);

    await this.redisService.del(VIP_REDIS_KEYS.SESSION_CACHE(userId));

    this.eventsGateway.broadcastVipEvent('vip:renewed', {
      userId,
      vip: updated,
    });
    this.eventsGateway.broadcastVipEvent('vip:status_updated', {
      userId,
      status: VipStatus.ACTIVE,
      level: tier.level,
    });

    return updated;
  }

  async renewVip(userId: string, dto: RenewVipDto): Promise<VipMembership> {
    return this.renew(userId, dto);
  }

  async cancel(userId: string): Promise<VipMembership> {
    const current = await this.membershipRepository.findOne({
      where: { userId },
    });
    if (!current || current.status !== VipStatus.ACTIVE) {
      throw new BadRequestException('No active VIP membership found to cancel');
    }

    current.status = VipStatus.CANCELLED;
    current.autoRenew = false;
    current.cancelledAt = new Date();
    const updated = await this.membershipRepository.save(current);

    const transaction = this.transactionRepository.create({
      userId,
      tierId: current.tierId,
      planId: current.planId,
      tierName: current.tierName,
      planName: current.planName,
      amount: 0,
      durationDays: 0,
      cycle: current.subscriptionCycle,
      action: 'CANCEL',
      status: 'SUCCESS',
    });
    await this.transactionRepository.save(transaction);

    await this.redisService.del(VIP_REDIS_KEYS.SESSION_CACHE(userId));

    this.eventsGateway.broadcastVipEvent('vip:cancelled', {
      userId,
      vipId: updated.id,
    });
    this.eventsGateway.broadcastVipEvent('vip:status_updated', {
      userId,
      status: VipStatus.CANCELLED,
    });

    return updated;
  }

  async cancelVip(userId: string): Promise<VipMembership> {
    return this.cancel(userId);
  }

  async upgradeOrDowngrade(
    userId: string,
    dto: UpgradeDowngradeVipDto,
    isUpgrade: boolean,
  ): Promise<VipMembership> {
    const targetTier = await this.findTierById(dto.newTierId);
    const current = await this.membershipRepository.findOne({
      where: { userId },
    });
    if (!current) {
      return this.subscribe(userId, {
        tierId: targetTier.id,
        cycle: dto.cycle,
      });
    }

    const actionName = isUpgrade ? 'UPGRADE' : 'DOWNGRADE';
    const cycle =
      dto.cycle || current.subscriptionCycle || SubscriptionCycle.MONTHLY;
    const price = Number(targetTier.monthlyPrice || 9.99);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    current.tierId = targetTier.id;
    current.planId = targetTier.id;
    current.tierName = targetTier.name;
    current.planName = targetTier.name;
    current.level = targetTier.level;
    current.badgeUrl = targetTier.badgeUrl || targetTier.badge || '';
    current.colorTheme = targetTier.colorTheme || '#FFD700';
    current.benefits = targetTier.benefits || [];
    current.status = VipStatus.ACTIVE;
    current.subscriptionCycle = cycle;
    current.expiresAt = expiresAt;
    current.lifetimeSpending = Number(current.lifetimeSpending || 0) + price;

    const updated = await this.membershipRepository.save(current);

    const transaction = this.transactionRepository.create({
      userId,
      tierId: targetTier.id,
      planId: targetTier.id,
      tierName: targetTier.name,
      planName: targetTier.name,
      amount: price,
      durationDays: 30,
      cycle,
      action: actionName,
      status: 'SUCCESS',
    });
    await this.transactionRepository.save(transaction);

    await this.redisService.del(VIP_REDIS_KEYS.SESSION_CACHE(userId));

    this.eventsGateway.broadcastVipEvent(`vip:${actionName.toLowerCase()}d`, {
      userId,
      vip: updated,
    });
    return updated;
  }

  async getCurrentMembershipDetails(userId: string): Promise<any> {
    const cacheKey = VIP_REDIS_KEYS.SESSION_CACHE(userId);
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        /* ignore */
      }
    }

    const membership = await this.membershipRepository.findOne({
      where: { userId },
    });
    if (!membership) {
      const result = {
        isVip: false,
        status: 'NONE',
        level: 0,
        tierName: 'Free User',
        experience: 0,
        progress: 0,
        lifetimeSpending: 0,
        badges: this.getBadgesForLevel(0),
        benefits: [],
        upgradeRecommendations: await this.getUpgradeRecommendations(0),
      };
      return result;
    }

    const now = new Date();
    if (membership.expiresAt < now && membership.status === VipStatus.ACTIVE) {
      membership.status = VipStatus.EXPIRED;
      await this.membershipRepository.save(membership);
    }

    const isVipActive = membership.status === VipStatus.ACTIVE;
    const currentLevel = isVipActive ? membership.level : 0;
    const exp = Number(membership.experience || 0);
    const targetNextExp = currentLevel * 1000;
    const currentLevelBaseExp = (currentLevel - 1) * 1000;
    const progressPercent =
      currentLevel >= 10
        ? 100
        : Math.min(100, Math.floor(((exp - currentLevelBaseExp) / 1000) * 100));

    const activeBenefits = isVipActive
      ? await this.getBenefitsForLevel(membership.level)
      : [];
    const badges = this.getBadgesForLevel(currentLevel);
    const recommendations = await this.getUpgradeRecommendations(currentLevel);

    const result = {
      ...membership,
      isVip: isVipActive,
      currentLevel,
      progress: Math.max(0, progressPercent),
      badges,
      activeBenefits,
      upgradeRecommendations: recommendations,
    };

    await this.redisService.set(cacheKey, JSON.stringify(result), 300);
    return result;
  }

  async getCurrentMembership(userId: string): Promise<any> {
    return this.getCurrentMembershipDetails(userId);
  }

  async getMembershipHistory(userId: string): Promise<VipTransaction[]> {
    return await this.transactionRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  // --- Dynamic Badges & Upgrade Recommendations ---
  getBadgesForLevel(level: number): Record<string, string> {
    if (level <= 0) {
      return {
        profileBadge: '',
        roomBadge: '',
        chatBadge: '',
        messagingBadge: '',
        giftBadge: '',
      };
    }
    const baseUrl = `https://cdn.voicecloud.app/badges/vip_${level}`;
    return {
      profileBadge: `${baseUrl}_profile.png`,
      roomBadge: `${baseUrl}_room.png`,
      chatBadge: `${baseUrl}_chat.png`,
      messagingBadge: `${baseUrl}_msg.png`,
      giftBadge: `${baseUrl}_gift.png`,
    };
  }

  async getUpgradeRecommendations(currentLevel: number): Promise<VipTier[]> {
    if (currentLevel >= 10) return [];
    return await this.tierRepository.find({
      where: { activationStatus: true },
      order: { level: 'ASC' },
      take: 3,
    });
  }

  // --- Benefits Engine ---
  async getBenefitsForLevel(level: number): Promise<VipBenefit[]> {
    if (level <= 0) return [];
    const cacheKey = VIP_REDIS_KEYS.BENEFITS_CACHE(level);
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        /* ignore */
      }
    }

    const benefits = await this.benefitRepository.find({
      where: { isActive: true },
    });

    const filtered = benefits.filter((b) => b.minVipLevel <= level);
    await this.redisService.set(cacheKey, JSON.stringify(filtered), 600);
    return filtered;
  }

  async getBenefitsForUser(userId: string): Promise<VipBenefit[]> {
    const details = await this.getCurrentMembershipDetails(userId);
    return details.activeBenefits || [];
  }

  async createBenefit(dto: CreateVipBenefitDto): Promise<VipBenefit> {
    const benefit = this.benefitRepository.create(dto);
    const saved = await this.benefitRepository.save(benefit);
    await this.refreshBenefitCaches();
    return saved;
  }

  async updateBenefit(
    id: string,
    dto: Partial<CreateVipBenefitDto>,
  ): Promise<VipBenefit> {
    const benefit = await this.benefitRepository.findOne({
      where: [{ id }, { key: id }],
    });
    if (!benefit) {
      throw new NotFoundException(`VIP Benefit '${id}' not found`);
    }
    Object.assign(benefit, dto);
    const saved = await this.benefitRepository.save(benefit);
    await this.refreshBenefitCaches();
    return saved;
  }

  async findAllBenefits(): Promise<VipBenefit[]> {
    return await this.benefitRepository.find({ order: { minVipLevel: 'ASC' } });
  }

  // --- Rewards Engine ---
  getPeriodKey(rewardType: VipRewardType): string {
    const now = new Date();
    if (rewardType === VipRewardType.DAILY) {
      return now.toISOString().split('T')[0]; // e.g. '2026-07-29'
    } else if (rewardType === VipRewardType.WEEKLY) {
      const year = now.getFullYear();
      const firstDay = new Date(year, 0, 1);
      const pastDays = Math.floor(
        (now.getTime() - firstDay.getTime()) / 86400000,
      );
      const weekNum = Math.ceil((pastDays + firstDay.getDay() + 1) / 7);
      return `${year}-W${weekNum}`;
    } else {
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }
  }

  async getAvailableRewards(userId: string): Promise<any[]> {
    const details = await this.getCurrentMembershipDetails(userId);
    const level = details.currentLevel || 0;

    const rewards = await this.rewardRepository.find({
      where: { isActive: true },
      order: { minVipLevel: 'ASC' },
    });

    const userClaims = await this.claimRepository.find({ where: { userId } });
    const claimSet = new Set(
      userClaims.map((c) => `${c.rewardId}_${c.periodKey}`),
    );

    return rewards.map((r) => {
      const periodKey = this.getPeriodKey(r.rewardType);
      const isClaimed = claimSet.has(`${r.id}_${periodKey}`);
      const isEligible = level >= r.minVipLevel;
      return {
        ...r,
        periodKey,
        isEligible,
        isClaimed,
        canClaim: isEligible && !isClaimed,
      };
    });
  }

  async claimReward(userId: string, rewardId: string): Promise<VipRewardClaim> {
    const details = await this.getCurrentMembershipDetails(userId);
    if (!details.isVip) {
      throw new BadRequestException(
        'Active VIP membership is required to claim VIP rewards',
      );
    }

    const reward = await this.rewardRepository.findOne({
      where: { id: rewardId },
    });
    if (!reward || !reward.isActive) {
      throw new NotFoundException('VIP Reward not found or inactive');
    }

    if (details.currentLevel < reward.minVipLevel) {
      throw new BadRequestException(
        `Your VIP Level (${details.currentLevel}) does not meet the required level (${reward.minVipLevel})`,
      );
    }

    const periodKey = this.getPeriodKey(reward.rewardType);
    const existingClaim = await this.claimRepository.findOne({
      where: { userId, rewardId: reward.id, periodKey },
    });

    if (existingClaim) {
      throw new BadRequestException(
        'You have already claimed this VIP reward for the current period',
      );
    }

    const claim = this.claimRepository.create({
      userId,
      rewardId: reward.id,
      rewardType: reward.rewardType,
      coinsClaimed: reward.coins || 0,
      expClaimed: reward.exp || 0,
      periodKey,
    });
    const saved = await this.claimRepository.save(claim);

    // Update user EXP
    const membership = await this.membershipRepository.findOne({
      where: { userId },
    });
    if (membership) {
      membership.experience =
        Number(membership.experience || 0) + (reward.exp || 0);
      await this.membershipRepository.save(membership);
    }

    await this.redisService.del(VIP_REDIS_KEYS.SESSION_CACHE(userId));
    return saved;
  }

  async getRewardHistory(userId: string): Promise<VipRewardClaim[]> {
    return await this.claimRepository.find({
      where: { userId },
      order: { claimedAt: 'DESC' },
    });
  }

  async getMissedRewards(userId: string): Promise<any> {
    const claims = await this.claimRepository.find({
      where: { userId, rewardType: VipRewardType.DAILY },
    });
    const now = new Date();
    const daysInMonth = now.getDate();
    const claimedCount = claims.length;
    const missedDays = Math.max(0, daysInMonth - claimedCount);
    return {
      currentMonthDays: daysInMonth,
      claimedDays: claimedCount,
      missedDays,
    };
  }

  async createReward(dto: CreateVipRewardDto): Promise<VipReward> {
    const reward = this.rewardRepository.create(dto);
    return await this.rewardRepository.save(reward);
  }

  async updateReward(
    id: string,
    dto: Partial<CreateVipRewardDto>,
  ): Promise<VipReward> {
    const reward = await this.rewardRepository.findOne({ where: { id } });
    if (!reward) throw new NotFoundException('Reward not found');
    Object.assign(reward, dto);
    return await this.rewardRepository.save(reward);
  }

  async findAllRewards(): Promise<VipReward[]> {
    return await this.rewardRepository.find({ order: { minVipLevel: 'ASC' } });
  }

  // --- VIP Exclusive Gifts Access & Pricing ---
  async getExclusiveGifts(userId: string): Promise<any[]> {
    const details = await this.getCurrentMembershipDetails(userId);
    const vipLevel = details.currentLevel || 0;

    let discountPercent = 0;
    if (vipLevel >= 9) discountPercent = 20;
    else if (vipLevel >= 7) discountPercent = 15;
    else if (vipLevel >= 4) discountPercent = 10;
    else if (vipLevel >= 1) discountPercent = 5;

    const gifts = await this.giftRepository.find({ where: { isActive: true } });

    return gifts
      .filter((g) => g.isVipOnly || g.isSeasonal || g.coinPrice >= 50)
      .map((g) => {
        const discountedPrice = Math.max(
          1,
          Math.floor(g.coinPrice * (1 - discountPercent / 100)),
        );
        return {
          ...g,
          originalPrice: g.coinPrice,
          vipPrice: discountedPrice,
          vipDiscountPercent: discountPercent,
          canPurchase: details.isVip,
        };
      });
  }

  // --- VIP Room Privileges ---
  async getRoomPrivileges(userId: string): Promise<any> {
    const details = await this.getCurrentMembershipDetails(userId);
    const level = details.currentLevel || 0;

    return {
      userId,
      isVip: details.isVip,
      vipLevel: level,
      hasReservedSeats: level >= 2,
      hasPriorityQueue: level >= 3,
      canEnterVipOnlyRooms: level >= 1,
      hasSpeakingPriority: level >= 4,
      moderationPrivileges: {
        canMuteOthers: level >= 5,
        canKickOthers: level >= 7,
        maxMutesPerDay: level * 5,
      },
    };
  }

  // --- VIP Analytics & Admin Reporting ---
  async getVipAnalytics(): Promise<any> {
    const totalMemberships = await this.membershipRepository.count();
    const activeMembers = await this.membershipRepository.count({
      where: { status: VipStatus.ACTIVE },
    });
    const expiredMembers = await this.membershipRepository.count({
      where: { status: VipStatus.EXPIRED },
    });
    const cancelledMembers = await this.membershipRepository.count({
      where: { status: VipStatus.CANCELLED },
    });

    const transactions = await this.transactionRepository.find();
    const totalRevenue = transactions.reduce(
      (acc, t) => acc + Number(t.amount || 0),
      0,
    );

    const revenueByCycle = {
      MONTHLY: transactions
        .filter((t) => t.cycle === 'MONTHLY')
        .reduce((acc, t) => acc + Number(t.amount || 0), 0),
      QUARTERLY: transactions
        .filter((t) => t.cycle === 'QUARTERLY')
        .reduce((acc, t) => acc + Number(t.amount || 0), 0),
      YEARLY: transactions
        .filter((t) => t.cycle === 'YEARLY')
        .reduce((acc, t) => acc + Number(t.amount || 0), 0),
    };

    const tiers = await this.tierRepository.find({ order: { level: 'ASC' } });
    const tierDistribution = await Promise.all(
      tiers.map(async (t) => {
        const count = await this.membershipRepository.count({
          where: { tierId: t.id, status: VipStatus.ACTIVE },
        });
        return {
          tierId: t.id,
          level: t.level,
          name: t.name,
          activeSubscribers: count,
        };
      }),
    );

    const totalClaims = await this.claimRepository.count();

    return {
      activeMembers,
      expiredMembers,
      cancelledMembers,
      totalMemberships,
      totalRevenue,
      revenueByCycle,
      tierDistribution,
      totalClaims,
      retentionRatePercent:
        totalMemberships > 0
          ? Math.round((activeMembers / totalMemberships) * 100)
          : 100,
    };
  }

  async getAllMembershipsAdmin(): Promise<VipMembership[]> {
    return await this.membershipRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async getUpcomingRenewalsAdmin(): Promise<VipMembership[]> {
    const now = new Date();
    const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return await this.membershipRepository.find({
      where: { status: VipStatus.ACTIVE },
      order: { expiresAt: 'ASC' },
    });
  }

  // --- BullMQ Worker Operations ---
  async processMembershipExpirations(): Promise<{ expiredCount: number }> {
    const now = new Date();
    const activeMemberships = await this.membershipRepository.find({
      where: { status: VipStatus.ACTIVE },
    });
    let expiredCount = 0;

    for (const m of activeMemberships) {
      if (m.expiresAt < now) {
        m.status = VipStatus.EXPIRED;
        await this.membershipRepository.save(m);
        await this.redisService.del(VIP_REDIS_KEYS.SESSION_CACHE(m.userId));
        expiredCount++;
      }
    }
    return { expiredCount };
  }

  async sendRenewalReminder(userId: string): Promise<{ sent: boolean }> {
    try {
      await this.notificationsService.createNotification({
        userId,
        title: 'VIP Subscription Expiring Soon!',
        message:
          'Your VIP membership is set to expire soon. Renew now to maintain your exclusive badges and perks!',
        type: NotificationType.SYSTEM,
      });
      return { sent: true };
    } catch {
      return { sent: false };
    }
  }

  async processRenewalReminders(): Promise<{ remindersSent: number }> {
    const now = new Date();
    const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const memberships = await this.membershipRepository.find({
      where: { status: VipStatus.ACTIVE },
    });
    let remindersSent = 0;

    for (const m of memberships) {
      if (m.expiresAt > now && m.expiresAt <= threeDaysLater) {
        await this.sendRenewalReminder(m.userId);
        remindersSent++;
      }
    }
    return { remindersSent };
  }

  async refreshBenefitCaches(): Promise<{ refreshed: boolean }> {
    await this.redisService.del(VIP_REDIS_KEYS.ALL_TIERS_CACHE);
    return { refreshed: true };
  }

  async processRewardDistributions(): Promise<{ reset: boolean }> {
    return { reset: true };
  }

  async aggregateVipAnalytics(): Promise<any> {
    return this.getVipAnalytics();
  }
}
