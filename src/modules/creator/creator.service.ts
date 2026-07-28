import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreatorPlan } from '../users/entities/creator-plan.entity';
import { CreatorSubscription } from '../users/entities/creator-subscription.entity';
import { CreatorPayoutRequest } from '../users/entities/creator-payout-request.entity';
import { User } from '../users/entities/user.entity';
import { WalletBalance } from '../wallet/entities/wallet-balance.entity';
import { CreateCreatorPlanDto } from './dto/create-creator-plan.dto';
import { UpdateCreatorPlanDto } from './dto/update-creator-plan.dto';
import { SubscribeCreatorDto } from './dto/subscribe-creator.dto';
import { CreatePayoutRequestDto } from './dto/create-payout-request.dto';
import { CreatorQueryDto } from './dto/creator-query.dto';
import {
  CreatorPlanStatus,
  SubscriptionStatus,
  PayoutStatus,
  VisibilityType,
} from '../../common/enums';

@Injectable()
export class CreatorService {
  constructor(
    @InjectRepository(CreatorPlan)
    private readonly planRepository: Repository<CreatorPlan>,
    @InjectRepository(CreatorSubscription)
    private readonly subscriptionRepository: Repository<CreatorSubscription>,
    @InjectRepository(CreatorPayoutRequest)
    private readonly payoutRepository: Repository<CreatorPayoutRequest>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(WalletBalance)
    private readonly walletBalanceRepository: Repository<WalletBalance>,
  ) {}

  /**
   * Creates a new creator subscription plan.
   */
  async createPlan(creatorId: string, dto: CreateCreatorPlanDto): Promise<CreatorPlan> {
    const plan = this.planRepository.create({
      creatorId,
      title: dto.title,
      description: dto.description || '',
      monthlyPrice: dto.monthlyPrice,
      yearlyPrice: dto.yearlyPrice,
      benefits: dto.benefits || [],
      visibility: dto.visibility || VisibilityType.PUBLIC,
      status: CreatorPlanStatus.ACTIVE,
    });

    return this.planRepository.save(plan);
  }

  /**
   * Updates an existing creator plan owned by the caller.
   */
  async updatePlan(
    creatorId: string,
    planId: string,
    dto: UpdateCreatorPlanDto,
  ): Promise<CreatorPlan> {
    const plan = await this.planRepository.findOne({ where: { id: planId } });

    if (!plan) {
      throw new NotFoundException(`Creator plan with ID '${planId}' not found`);
    }

    if (plan.creatorId !== creatorId) {
      throw new ForbiddenException('You are not authorized to update this plan');
    }

    Object.assign(plan, dto);
    return this.planRepository.save(plan);
  }

  /**
   * Archives or deactivates a creator plan owned by the caller.
   */
  async deletePlan(creatorId: string, planId: string): Promise<CreatorPlan> {
    const plan = await this.planRepository.findOne({ where: { id: planId } });

    if (!plan) {
      throw new NotFoundException(`Creator plan with ID '${planId}' not found`);
    }

    if (plan.creatorId !== creatorId) {
      throw new ForbiddenException('You are not authorized to archive this plan');
    }

    plan.status = CreatorPlanStatus.ARCHIVED;
    return this.planRepository.save(plan);
  }

  /**
   * Lists creator plans owned by the authenticated creator.
   */
  async getCreatorPlans(creatorId: string, query: CreatorQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const qb = this.planRepository.createQueryBuilder('plan');
    qb.where('plan.creatorId = :creatorId', { creatorId });

    if (query.status) {
      qb.andWhere('plan.status = :status', { status: query.status });
    }

    const sortOrder = query.sortOrder === 'ASC' ? 'ASC' : 'DESC';
    qb.orderBy('plan.createdAt', sortOrder).skip(skip).take(limit);

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
   * Public endpoint returning active public plans for a given creator ID.
   */
  async getPublicCreatorPlans(creatorId: string): Promise<CreatorPlan[]> {
    const creatorExists = await this.userRepository.findOne({
      where: { id: creatorId },
    });

    if (!creatorExists) {
      throw new NotFoundException(`Creator with ID '${creatorId}' not found`);
    }

    return this.planRepository.find({
      where: {
        creatorId,
        status: CreatorPlanStatus.ACTIVE,
        visibility: VisibilityType.PUBLIC,
      },
      order: { monthlyPrice: 'ASC' },
    });
  }

  /**
   * Creates a subscription record for a user to a creator's plan.
   * Records subscription intent only (no balance deduction or payment gateway integration).
   */
  async subscribeToCreator(
    subscriberId: string,
    creatorId: string,
    dto: SubscribeCreatorDto,
  ): Promise<CreatorSubscription> {
    if (subscriberId === creatorId) {
      throw new BadRequestException('You cannot subscribe to yourself');
    }

    const plan = await this.planRepository.findOne({
      where: { id: dto.planId },
    });

    if (!plan) {
      throw new NotFoundException(`Creator plan with ID '${dto.planId}' not found`);
    }

    if (plan.creatorId !== creatorId) {
      throw new BadRequestException('Plan does not belong to the specified creator');
    }

    if (plan.status !== CreatorPlanStatus.ACTIVE) {
      throw new BadRequestException('Creator plan is not active for subscription');
    }

    const existingSub = await this.subscriptionRepository.findOne({
      where: {
        subscriberId,
        creatorId,
        planId: dto.planId,
        status: SubscriptionStatus.ACTIVE,
      },
    });

    if (existingSub) {
      throw new ConflictException('You are already actively subscribed to this plan');
    }

    const startedAt = new Date();
    const expiresAt = new Date(startedAt.getTime() + 30 * 24 * 60 * 60 * 1000);

    const subscription = this.subscriptionRepository.create({
      subscriberId,
      creatorId,
      planId: dto.planId,
      status: SubscriptionStatus.ACTIVE,
      autoRenew: dto.autoRenew !== undefined ? dto.autoRenew : true,
      startedAt,
      expiresAt,
    });

    return this.subscriptionRepository.save(subscription);
  }

  /**
   * Retrieves active subscriptions of the authenticated user.
   */
  async getUserSubscriptions(subscriberId: string, query: CreatorQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const qb = this.subscriptionRepository.createQueryBuilder('sub');
    qb.leftJoinAndSelect('sub.creator', 'creator')
      .leftJoinAndSelect('sub.plan', 'plan')
      .where('sub.subscriberId = :subscriberId', { subscriberId });

    if (query.status) {
      qb.andWhere('sub.status = :status', { status: query.status });
    }

    const sortOrder = query.sortOrder === 'ASC' ? 'ASC' : 'DESC';
    qb.orderBy('sub.createdAt', sortOrder).skip(skip).take(limit);

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
   * Retrieves subscribers for the authenticated creator.
   */
  async getCreatorSubscribers(creatorId: string, query: CreatorQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const qb = this.subscriptionRepository.createQueryBuilder('sub');
    qb.leftJoinAndSelect('sub.subscriber', 'subscriber')
      .leftJoinAndSelect('sub.plan', 'plan')
      .where('sub.creatorId = :creatorId', { creatorId });

    if (query.status) {
      qb.andWhere('sub.status = :status', { status: query.status });
    } else {
      qb.andWhere('sub.status = :status', { status: SubscriptionStatus.ACTIVE });
    }

    const sortOrder = query.sortOrder === 'ASC' ? 'ASC' : 'DESC';
    qb.orderBy('sub.createdAt', sortOrder).skip(skip).take(limit);

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
   * Retrieves creator earnings overview and subscription analytics (read-only).
   */
  async getEarningsOverview(creatorId: string) {
    const activeSubscribersCount = await this.subscriptionRepository.count({
      where: { creatorId, status: SubscriptionStatus.ACTIVE },
    });

    const activeSubscriptions = await this.subscriptionRepository.find({
      where: { creatorId, status: SubscriptionStatus.ACTIVE },
      relations: { plan: true },
    });

    const estimatedRecurringRevenue = activeSubscriptions.reduce((acc, sub) => {
      const price = sub.plan ? Number(sub.plan.monthlyPrice) || 0 : 0;
      return acc + price;
    }, 0);

    const activePlansCount = await this.planRepository.count({
      where: { creatorId, status: CreatorPlanStatus.ACTIVE },
    });

    const pendingPayouts = await this.payoutRepository.find({
      where: { creatorId, status: PayoutStatus.PENDING },
    });

    const pendingPayoutsAmount = pendingPayouts.reduce(
      (acc, p) => acc + (Number(p.payoutAmount) || 0),
      0,
    );

    const completedPayouts = await this.payoutRepository.find({
      where: { creatorId, status: PayoutStatus.PROCESSED },
    });

    const approvedPayouts = await this.payoutRepository.find({
      where: { creatorId, status: PayoutStatus.APPROVED },
    });

    const completedPayoutsAmount = [...completedPayouts, ...approvedPayouts].reduce(
      (acc, p) => acc + (Number(p.payoutAmount) || 0),
      0,
    );

    const lifetimeEarnings = completedPayoutsAmount + estimatedRecurringRevenue;

    const recentSubscriptions = await this.subscriptionRepository.find({
      where: { creatorId },
      relations: { subscriber: true, plan: true },
      order: { startedAt: 'DESC' },
      take: 5,
    });

    return {
      totalSubscribers: activeSubscribersCount,
      estimatedRecurringRevenue: Number(estimatedRecurringRevenue.toFixed(2)),
      activePlansCount,
      pendingPayoutsAmount: Number(pendingPayoutsAmount.toFixed(2)),
      completedPayoutsAmount: Number(completedPayoutsAmount.toFixed(2)),
      lifetimeEarnings: Number(lifetimeEarnings.toFixed(2)),
      recentSubscriptions,
    };
  }

  /**
   * Submits a payout request for an authenticated creator.
   */
  async submitPayoutRequest(
    creatorId: string,
    dto: CreatePayoutRequestDto,
  ): Promise<CreatorPayoutRequest> {
    if (dto.diamondAmount < 100) {
      throw new BadRequestException(
        'Minimum payout threshold is 100 diamonds',
      );
    }

    const existingPending = await this.payoutRepository.findOne({
      where: { creatorId, status: PayoutStatus.PENDING },
    });

    if (existingPending) {
      throw new ConflictException(
        'You already have a pending payout request in review',
      );
    }

    const wallet = await this.walletBalanceRepository.findOne({
      where: { userId: creatorId },
    });

    const currentDiamonds = wallet ? Number(wallet.diamondBalance) || 0 : 0;

    if (currentDiamonds < dto.diamondAmount) {
      throw new BadRequestException(
        `Insufficient diamond balance. You have ${currentDiamonds} diamonds available.`,
      );
    }

    const payoutAmount = Number((dto.diamondAmount * 0.005).toFixed(2));

    const request = this.payoutRepository.create({
      creatorId,
      diamondAmount: dto.diamondAmount,
      payoutAmount,
      payoutMethod: dto.payoutMethod,
      accountDetails: dto.accountDetails || {},
      status: PayoutStatus.PENDING,
    });

    return this.payoutRepository.save(request);
  }

  /**
   * Lists payout requests submitted by the authenticated creator.
   */
  async getCreatorPayoutRequests(creatorId: string, query: CreatorQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const qb = this.payoutRepository.createQueryBuilder('payout');
    qb.where('payout.creatorId = :creatorId', { creatorId });

    if (query.status) {
      qb.andWhere('payout.status = :status', { status: query.status });
    }

    const sortOrder = query.sortOrder === 'ASC' ? 'ASC' : 'DESC';
    qb.orderBy('payout.createdAt', sortOrder).skip(skip).take(limit);

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
   * Gets details of a specific payout request owned by the creator.
   */
  async getPayoutRequestById(
    creatorId: string,
    id: string,
  ): Promise<CreatorPayoutRequest> {
    const payout = await this.payoutRepository.findOne({
      where: { id },
    });

    if (!payout) {
      throw new NotFoundException(`Payout request with ID '${id}' not found`);
    }

    if (payout.creatorId !== creatorId) {
      throw new ForbiddenException(
        'You are not authorized to view this payout request',
      );
    }

    return payout;
  }

  /**
   * Retrieves comprehensive dashboard summary for the authenticated creator.
   */
  async getCreatorDashboard(creatorId: string) {
    const user = await this.userRepository.findOne({
      where: { id: creatorId },
    });

    if (!user) {
      throw new NotFoundException(`Creator user with ID '${creatorId}' not found`);
    }

    const totalPlans = await this.planRepository.count({
      where: { creatorId },
    });

    const activePlans = await this.planRepository.count({
      where: { creatorId, status: CreatorPlanStatus.ACTIVE },
    });

    const activeSubscriberCount = await this.subscriptionRepository.count({
      where: { creatorId, status: SubscriptionStatus.ACTIVE },
    });

    const earnings = await this.getEarningsOverview(creatorId);

    const totalRequests = await this.payoutRepository.count({
      where: { creatorId },
    });

    const pendingRequests = await this.payoutRepository.count({
      where: { creatorId, status: PayoutStatus.PENDING },
    });

    const completedRequests = await this.payoutRepository.count({
      where: { creatorId, status: PayoutStatus.PROCESSED },
    });

    const latestSubscriptions = await this.subscriptionRepository.find({
      where: { creatorId },
      relations: { subscriber: true, plan: true },
      order: { startedAt: 'DESC' },
      take: 5,
    });

    const latestPayoutRequests = await this.payoutRepository.find({
      where: { creatorId },
      order: { createdAt: 'DESC' },
      take: 5,
    });

    return {
      creatorProfile: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        isVerified: user.isVerified,
      },
      plansSummary: {
        totalPlans,
        activePlans,
      },
      subscriberCount: activeSubscriberCount,
      earningsSummary: {
        estimatedRecurringRevenue: earnings.estimatedRecurringRevenue,
        totalLifetimePayouts: earnings.completedPayoutsAmount,
        pendingPayouts: earnings.pendingPayoutsAmount,
        lifetimeEarnings: earnings.lifetimeEarnings,
      },
      payoutSummary: {
        totalRequests,
        pendingRequests,
        completedRequests,
      },
      latestSubscriptions,
      latestPayoutRequests,
    };
  }
}
