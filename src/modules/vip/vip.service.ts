import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VipPlan } from './entities/vip-plan.entity';
import { UserVip, VipStatus } from './entities/user-vip.entity';
import { VipPurchaseHistory } from './entities/vip-purchase-history.entity';
import { CreateVipPlanDto } from './dto/create-vip-plan.dto';
import { UpdateVipPlanDto } from './dto/update-vip-plan.dto';
import { PurchaseVipDto } from './dto/purchase-vip.dto';
import { RenewVipDto } from './dto/renew-vip.dto';
import { EventsGateway } from '../../common/events/events.gateway';

@Injectable()
export class VipService {
  constructor(
    @InjectRepository(VipPlan)
    private readonly planRepository: Repository<VipPlan>,
    @InjectRepository(UserVip)
    private readonly userVipRepository: Repository<UserVip>,
    @InjectRepository(VipPurchaseHistory)
    private readonly historyRepository: Repository<VipPurchaseHistory>,
    private readonly eventsGateway: EventsGateway,
  ) {}

  // Admin Plan CRUD
  async createPlan(dto: CreateVipPlanDto): Promise<VipPlan> {
    const plan = this.planRepository.create(dto);
    return await this.planRepository.save(plan);
  }

  async findAllPlans(includeInactive = false): Promise<VipPlan[]> {
    if (includeInactive) {
      return await this.planRepository.find({ order: { level: 'ASC' } });
    }
    return await this.planRepository.find({
      where: { isActive: true },
      order: { level: 'ASC' },
    });
  }

  async findPlanById(id: string): Promise<VipPlan> {
    const plan = await this.planRepository.findOne({ where: { id } });
    if (!plan) {
      throw new NotFoundException(`VIP Plan with ID ${id} not found`);
    }
    return plan;
  }

  async updatePlan(id: string, dto: UpdateVipPlanDto): Promise<VipPlan> {
    const plan = await this.findPlanById(id);
    Object.assign(plan, dto);
    return await this.planRepository.save(plan);
  }

  async deletePlan(id: string): Promise<{ success: boolean }> {
    const plan = await this.findPlanById(id);
    await this.planRepository.remove(plan);
    return { success: true };
  }

  // User VIP Operations
  async purchaseVip(userId: string, dto: PurchaseVipDto): Promise<UserVip> {
    const plan = await this.findPlanById(dto.planId);
    if (!plan.isActive) {
      throw new BadRequestException('Selected VIP plan is currently inactive');
    }

    let existing = await this.userVipRepository.findOne({ where: { userId } });
    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000,
    );

    if (existing) {
      existing.planId = plan.id;
      existing.planName = plan.name;
      existing.level = plan.level;
      existing.badgeUrl = plan.badgeUrl ?? '';
      existing.benefits = plan.benefits ?? [];
      existing.status = VipStatus.ACTIVE;
      existing.autoRenew = dto.autoRenew ?? true;
      existing.startDate = now;
      existing.expiresAt = expiresAt;
      existing = await this.userVipRepository.save(existing);
    } else {
      existing = this.userVipRepository.create({
        userId,
        planId: plan.id,
        planName: plan.name,
        level: plan.level,
        badgeUrl: plan.badgeUrl ?? '',
        benefits: plan.benefits ?? [],
        status: VipStatus.ACTIVE,
        autoRenew: dto.autoRenew ?? true,
        startDate: now,
        expiresAt,
      });
      existing = await this.userVipRepository.save(existing);
    }

    // Log history
    const history = this.historyRepository.create({
      userId,
      planId: plan.id,
      planName: plan.name,
      amount: plan.price,
      durationDays: plan.durationDays,
      action: 'PURCHASE',
    });
    await this.historyRepository.save(history);

    // Emit Realtime Events
    this.eventsGateway.broadcastVipEvent('vip:purchased', {
      userId,
      vip: existing,
    });
    this.eventsGateway.broadcastVipEvent('vip:status_updated', {
      userId,
      status: VipStatus.ACTIVE,
      level: plan.level,
    });

    return existing;
  }

  async cancelVip(userId: string): Promise<UserVip> {
    const current = await this.userVipRepository.findOne({ where: { userId } });
    if (!current || current.status !== VipStatus.ACTIVE) {
      throw new BadRequestException('No active VIP membership found to cancel');
    }

    current.status = VipStatus.CANCELLED;
    current.autoRenew = false;
    const updated = await this.userVipRepository.save(current);

    const history = this.historyRepository.create({
      userId,
      planId: current.planId,
      planName: current.planName,
      amount: 0,
      durationDays: 0,
      action: 'CANCEL',
    });
    await this.historyRepository.save(history);

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

  async renewVip(userId: string, dto: RenewVipDto): Promise<UserVip> {
    const current = await this.userVipRepository.findOne({ where: { userId } });
    if (!current) {
      throw new NotFoundException(
        'No existing VIP membership record found to renew',
      );
    }

    const planId = dto?.planId || current.planId;
    const plan = await this.findPlanById(planId);

    const now = new Date();
    const baseDate = current.expiresAt > now ? current.expiresAt : now;
    const newExpiresAt = new Date(
      baseDate.getTime() + plan.durationDays * 24 * 60 * 60 * 1000,
    );

    current.planId = plan.id;
    current.planName = plan.name;
    current.level = plan.level;
    current.badgeUrl = plan.badgeUrl ?? current.badgeUrl;
    current.benefits = plan.benefits ?? current.benefits;
    current.status = VipStatus.ACTIVE;
    current.expiresAt = newExpiresAt;

    const updated = await this.userVipRepository.save(current);

    const history = this.historyRepository.create({
      userId,
      planId: plan.id,
      planName: plan.name,
      amount: plan.price,
      durationDays: plan.durationDays,
      action: 'RENEWAL',
    });
    await this.historyRepository.save(history);

    this.eventsGateway.broadcastVipEvent('vip:renewed', {
      userId,
      vip: updated,
    });
    this.eventsGateway.broadcastVipEvent('vip:status_updated', {
      userId,
      status: VipStatus.ACTIVE,
      level: plan.level,
    });

    return updated;
  }

  async getCurrentMembership(
    userId: string,
  ): Promise<UserVip | { isVip: boolean; status: string }> {
    const membership = await this.userVipRepository.findOne({
      where: { userId },
    });
    if (!membership) {
      return { isVip: false, status: 'NONE' };
    }
    const now = new Date();
    if (membership.expiresAt < now && membership.status === VipStatus.ACTIVE) {
      membership.status = VipStatus.EXPIRED;
      await this.userVipRepository.save(membership);
    }
    return membership;
  }

  async getMembershipHistory(userId: string): Promise<VipPurchaseHistory[]> {
    return await this.historyRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }
}
