import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  Inject,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  HostProfile,
  HostVerificationStatus,
} from './entities/host-profile.entity';
import { HostAuditNote } from './entities/host-audit-note.entity';
import { HostEarnings } from './entities/host-earnings.entity';
import { HostPerformance } from './entities/host-performance.entity';
import { HostRoom } from './entities/host-room.entity';
import { HostIncidentLog } from './entities/host-incident-log.entity';
import { HostReward } from './entities/host-reward.entity';
import { ApplyHostDto } from './dto/apply-host.dto';
import { UpdateHostProfileDto } from './dto/update-host-profile.dto';
import { SearchHostsDto } from './dto/search-hosts.dto';
import { CreateHostRoomDto } from './dto/create-host-room.dto';
import { HostModerationActionDto } from './dto/host-moderation-action.dto';
import { EventsGateway } from '../../common/events/events.gateway';
import { StorageService } from '../storage/storage.service';
import { MediaCategory } from '../storage/enums/media-category.enum';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class HostsService {
  constructor(
    @InjectRepository(HostProfile)
    private readonly hostRepository: Repository<HostProfile>,
    @InjectRepository(HostAuditNote)
    private readonly auditNoteRepository: Repository<HostAuditNote>,
    @InjectRepository(HostEarnings)
    private readonly earningsRepository: Repository<HostEarnings>,
    @InjectRepository(HostPerformance)
    private readonly performanceRepository: Repository<HostPerformance>,
    @InjectRepository(HostRoom)
    private readonly roomRepository: Repository<HostRoom>,
    @InjectRepository(HostIncidentLog)
    private readonly incidentRepository: Repository<HostIncidentLog>,
    @InjectRepository(HostReward)
    private readonly rewardRepository: Repository<HostReward>,
    private readonly eventsGateway: EventsGateway,
    private readonly storageService: StorageService,
    @Optional() private readonly redisService?: RedisService,
  ) {}

  // ==========================================
  // 1. HOST APPLICATION & VERIFICATION
  // ==========================================

  async applyForVerification(
    userId: string,
    dto: ApplyHostDto,
  ): Promise<HostProfile> {
    let existing = await this.hostRepository.findOne({ where: { userId } });
    if (existing) {
      if (existing.status === HostVerificationStatus.APPROVED) {
        throw new ConflictException('Host is already verified and approved');
      }
      if (existing.status === HostVerificationStatus.PENDING) {
        throw new ConflictException(
          'Host verification application is currently pending review',
        );
      }
      // If rejected, re-apply
      const idNumberToUse =
        dto.idNumber &&
        !dto.idNumber.includes('*') &&
        dto.idNumber.trim() !== ''
          ? dto.idNumber
          : existing.idNumber;
      const documentUrlToUse =
        dto.documentUrl && !dto.documentUrl.includes('sample_')
          ? dto.documentUrl
          : existing.documentUrl;
      const selfieUrlToUse =
        dto.selfieUrl && !dto.selfieUrl.includes('sample_')
          ? dto.selfieUrl
          : existing.selfieUrl;

      Object.assign(existing, {
        ...dto,
        idNumber: idNumberToUse,
        documentUrl: documentUrlToUse,
        selfieUrl: selfieUrlToUse,
        status: HostVerificationStatus.PENDING,
        rejectionReason: null,
      });
      existing = await this.hostRepository.save(existing);
      await this.logAuditNote(
        existing.id,
        'SYSTEM',
        'Host re-applied for verification',
        'RE_APPLIED',
      );
      this.eventsGateway.broadcastHostEvent('host:status_updated', {
        userId,
        status: HostVerificationStatus.PENDING,
      });
      return existing;
    }

    const host = this.hostRepository.create({
      userId,
      ...dto,
      status: HostVerificationStatus.PENDING,
    });
    const saved = await this.hostRepository.save(host);

    // Initialize Earnings record
    await this.getOrCreateEarnings(saved.id, userId);
    // Initialize Performance record
    await this.getOrCreatePerformance(saved.id, userId);

    await this.logAuditNote(
      saved.id,
      'SYSTEM',
      'Host submitted verification application',
      'APPLIED',
    );

    this.eventsGateway.broadcastHostEvent('host:status_updated', {
      userId,
      status: HostVerificationStatus.PENDING,
    });
    return saved;
  }

  async getHostProfile(userId: string): Promise<HostProfile> {
    const profile = await this.hostRepository.findOne({ where: { userId } });
    if (!profile) {
      throw new NotFoundException(`Host profile for user ${userId} not found`);
    }
    return profile;
  }

  async updateHostProfile(
    userId: string,
    dto: UpdateHostProfileDto,
  ): Promise<HostProfile> {
    const profile = await this.getHostProfile(userId);
    Object.assign(profile, dto);
    const updated = await this.hostRepository.save(profile);

    // Invalidate Redis cache
    if (this.redisService) {
      await this.redisService.del(`host:profile:${userId}`);
    }

    return updated;
  }

  async searchHosts(dto: SearchHostsDto): Promise<HostProfile[]> {
    const queryBuilder = this.hostRepository.createQueryBuilder('host');

    queryBuilder.andWhere('host.status = :status', {
      status: HostVerificationStatus.APPROVED,
    });

    if (dto.query) {
      queryBuilder.andWhere(
        '(host.realName ILIKE :query OR host.bio ILIKE :query)',
        { query: `%${dto.query}%` },
      );
    }

    if (dto.country) {
      queryBuilder.andWhere('host.country ILIKE :country', {
        country: `%${dto.country}%`,
      });
    }

    return await queryBuilder.getMany();
  }

  // Admin Methods for Applications
  async getApplications(
    status?: HostVerificationStatus,
  ): Promise<HostProfile[]> {
    if (status) {
      return await this.hostRepository.find({
        where: { status },
        order: { createdAt: 'DESC' },
      });
    }
    return await this.hostRepository.find({ order: { createdAt: 'DESC' } });
  }

  async approveHost(id: string, adminId = 'ADMIN'): Promise<HostProfile> {
    let host = await this.hostRepository.findOne({ where: { id } });
    if (!host) {
      host = await this.hostRepository.findOne({ where: { userId: id } });
    }
    if (!host) {
      throw new NotFoundException(`Host application with ID ${id} not found`);
    }

    if (adminId && (adminId === host.userId || adminId === host.id)) {
      throw new ForbiddenException(
        'Administrators cannot approve their own host application',
      );
    }

    host.status = HostVerificationStatus.APPROVED;
    host.rejectionReason = null;
    const saved = await this.hostRepository.save(host);

    await this.logAuditNote(
      host.id,
      adminId,
      'Host application approved by admin',
      'APPROVED',
    );

    this.eventsGateway.broadcastHostEvent('host:verified', {
      userId: host.userId,
      hostId: host.id,
    });
    this.eventsGateway.broadcastHostEvent('host:status_updated', {
      userId: host.userId,
      status: HostVerificationStatus.APPROVED,
    });

    return saved;
  }

  async rejectHost(
    id: string,
    reason?: string,
    adminId = 'ADMIN',
  ): Promise<HostProfile> {
    let host = await this.hostRepository.findOne({ where: { id } });
    if (!host) {
      host = await this.hostRepository.findOne({ where: { userId: id } });
    }
    if (!host) {
      throw new NotFoundException(`Host application with ID ${id} not found`);
    }

    if (adminId && (adminId === host.userId || adminId === host.id)) {
      throw new ForbiddenException(
        'Administrators cannot reject their own host application',
      );
    }

    host.status = HostVerificationStatus.REJECTED;
    host.rejectionReason = reason ?? 'Verification request rejected by admin';
    const saved = await this.hostRepository.save(host);

    await this.logAuditNote(
      host.id,
      adminId,
      `Host application rejected: ${host.rejectionReason}`,
      'REJECTED',
    );

    this.eventsGateway.broadcastHostEvent('host:status_updated', {
      userId: host.userId,
      status: HostVerificationStatus.REJECTED,
      reason: host.rejectionReason,
    });

    return saved;
  }

  async suspendHost(id: string, adminId = 'ADMIN'): Promise<HostProfile> {
    let host = await this.hostRepository.findOne({ where: { id } });
    if (!host) {
      host = await this.hostRepository.findOne({ where: { userId: id } });
    }
    if (!host) {
      throw new NotFoundException(`Host application with ID ${id} not found`);
    }

    if (adminId && (adminId === host.userId || adminId === host.id)) {
      throw new ForbiddenException(
        'Administrators cannot suspend their own host profile',
      );
    }

    host.status = HostVerificationStatus.SUSPENDED;
    const saved = await this.hostRepository.save(host);

    await this.logAuditNote(
      host.id,
      adminId,
      'Host status suspended by admin',
      'SUSPENDED',
    );

    this.eventsGateway.broadcastHostEvent('host:status_updated', {
      userId: host.userId,
      status: HostVerificationStatus.SUSPENDED,
    });

    return saved;
  }

  async reactivateHost(id: string, adminId = 'ADMIN'): Promise<HostProfile> {
    let host = await this.hostRepository.findOne({ where: { id } });
    if (!host) {
      host = await this.hostRepository.findOne({ where: { userId: id } });
    }
    if (!host) {
      throw new NotFoundException(`Host application with ID ${id} not found`);
    }

    if (adminId && (adminId === host.userId || adminId === host.id)) {
      throw new ForbiddenException(
        'Administrators cannot reactivate their own host profile',
      );
    }

    host.status = HostVerificationStatus.APPROVED;
    const saved = await this.hostRepository.save(host);

    await this.logAuditNote(
      host.id,
      adminId,
      'Host status reactivated by admin',
      'ACTIVATED',
    );

    this.eventsGateway.broadcastHostEvent('host:status_updated', {
      userId: host.userId,
      status: HostVerificationStatus.APPROVED,
    });

    return saved;
  }

  // Audit Notes & History
  async logAuditNote(
    hostProfileId: string,
    adminId: string,
    note: string,
    action = 'NOTE_ADDED',
  ): Promise<HostAuditNote> {
    const auditNote = this.auditNoteRepository.create({
      hostProfileId,
      adminId,
      note,
      action,
    });
    return await this.auditNoteRepository.save(auditNote);
  }

  async getAuditHistory(hostProfileId: string): Promise<HostAuditNote[]> {
    return await this.auditNoteRepository.find({
      where: { hostProfileId },
      order: { createdAt: 'DESC' },
    });
  }

  // Upload Helpers
  async uploadGovernmentId(userId: string, file: Express.Multer.File) {
    const media = await this.storageService.uploadFile(
      file,
      {
        category: MediaCategory.HOST_ID,
        entityType: 'host_verification',
        entityId: userId,
      },
      userId,
    );

    const profile = await this.hostRepository.findOne({ where: { userId } });
    if (profile) {
      profile.documentUrl = media.publicUrl;
      await this.hostRepository.save(profile);
    }

    return {
      message: 'Government ID uploaded successfully',
      documentUrl: media.publicUrl,
      media,
    };
  }

  async uploadProfilePhoto(userId: string, file: Express.Multer.File) {
    const media = await this.storageService.uploadFile(
      file,
      {
        category: MediaCategory.HOST_PHOTO,
        entityType: 'host_verification',
        entityId: userId,
      },
      userId,
    );

    const profile = await this.hostRepository.findOne({ where: { userId } });
    if (profile) {
      profile.selfieUrl = media.publicUrl;
      await this.hostRepository.save(profile);
    }

    return {
      message: 'Profile photo uploaded successfully',
      selfieUrl: media.publicUrl,
      media,
    };
  }

  async uploadVerificationDocument(userId: string, file: Express.Multer.File) {
    const media = await this.storageService.uploadFile(
      file,
      {
        category: MediaCategory.HOST_DOCUMENT,
        entityType: 'host_verification',
        entityId: userId,
      },
      userId,
    );

    return {
      message: 'Verification document uploaded successfully',
      documentUrl: media.publicUrl,
      media,
    };
  }

  // ==========================================
  // 3. HOST LEVEL & PROGRESSION
  // ==========================================

  async addXP(userId: string, xpAmount: number): Promise<HostProfile> {
    const host = await this.getHostProfile(userId);
    host.xp = (host.xp || 0) + xpAmount;
    await this.calculateAndApplyLevel(host);
    return await this.hostRepository.save(host);
  }

  private async calculateAndApplyLevel(host: HostProfile): Promise<number> {
    // Level formula:
    // Level 1: 0 XP
    // Level 2: 1,000 XP
    // Level 3: 5,000 XP
    // Level 4: 15,000 XP
    // Level 5: 50,000 XP
    let newLevel = 1;
    const xp = host.xp || 0;
    if (xp >= 50000) newLevel = 5;
    else if (xp >= 15000) newLevel = 4;
    else if (xp >= 5000) newLevel = 3;
    else if (xp >= 1000) newLevel = 2;

    if (newLevel > host.hostLevel) {
      const oldLevel = host.hostLevel;
      host.hostLevel = newLevel;
      await this.logAuditNote(
        host.id,
        'SYSTEM',
        `Host promoted from Level ${oldLevel} to Level ${newLevel}`,
        'LEVEL_PROMOTED',
      );
      this.eventsGateway.broadcastHostEvent('host:level_up', {
        userId: host.userId,
        oldLevel,
        newLevel,
      });
    }
    return host.hostLevel;
  }

  async checkPromotionRequirements(userId: string) {
    const host = await this.getHostProfile(userId);
    const currentLevel = host.hostLevel;
    const nextLevel = currentLevel + 1;

    let requiredXP = 1000;
    if (nextLevel === 3) requiredXP = 5000;
    if (nextLevel === 4) requiredXP = 15000;
    if (nextLevel === 5) requiredXP = 50000;

    return {
      currentLevel,
      nextLevel,
      currentXP: host.xp || 0,
      requiredXP,
      progressPercentage: Math.min(
        100,
        Math.round(((host.xp || 0) / requiredXP) * 100),
      ),
      isEligible: (host.xp || 0) >= requiredXP,
    };
  }

  // ==========================================
  // 4. HOST EARNINGS DASHBOARD
  // ==========================================

  private async getOrCreateEarnings(
    hostProfileId: string,
    userId: string,
  ): Promise<HostEarnings> {
    let earnings = await this.earningsRepository.findOne({
      where: { hostProfileId },
    });
    if (!earnings) {
      earnings = this.earningsRepository.create({
        hostProfileId,
        userId,
        dailyEarnings: 0,
        weeklyEarnings: 0,
        monthlyEarnings: 0,
        lifetimeEarnings: 0,
        pendingSettlements: 0,
        completedSettlements: 0,
        giftIncome: 0,
        vipBonusIncome: 0,
        roomBonusIncome: 0,
      });
      earnings = await this.earningsRepository.save(earnings);
    }
    return earnings;
  }

  async getEarnings(userId: string): Promise<HostEarnings> {
    const host = await this.getHostProfile(userId);
    return await this.getOrCreateEarnings(host.id, userId);
  }

  async recordIncome(
    userId: string,
    giftIncome = 0,
    vipBonusIncome = 0,
    roomBonusIncome = 0,
  ): Promise<HostEarnings> {
    const host = await this.getHostProfile(userId);
    const earnings = await this.getOrCreateEarnings(host.id, userId);

    const totalNew = giftIncome + vipBonusIncome + roomBonusIncome;

    earnings.giftIncome = Number(earnings.giftIncome) + giftIncome;
    earnings.vipBonusIncome = Number(earnings.vipBonusIncome) + vipBonusIncome;
    earnings.roomBonusIncome =
      Number(earnings.roomBonusIncome) + roomBonusIncome;

    earnings.dailyEarnings = Number(earnings.dailyEarnings) + totalNew;
    earnings.weeklyEarnings = Number(earnings.weeklyEarnings) + totalNew;
    earnings.monthlyEarnings = Number(earnings.monthlyEarnings) + totalNew;
    earnings.lifetimeEarnings = Number(earnings.lifetimeEarnings) + totalNew;

    const saved = await this.earningsRepository.save(earnings);

    // Also award XP (1 XP per $1 earned)
    await this.addXP(userId, Math.floor(totalNew));

    return saved;
  }

  async requestSettlement(
    userId: string,
    amount: number,
  ): Promise<HostEarnings> {
    const earnings = await this.getEarnings(userId);
    const available =
      Number(earnings.lifetimeEarnings) -
      Number(earnings.completedSettlements) -
      Number(earnings.pendingSettlements);

    if (amount > available) {
      throw new BadRequestException(
        `Insufficient unsettled earnings balance. Available: $${available.toFixed(2)}`,
      );
    }

    earnings.pendingSettlements = Number(earnings.pendingSettlements) + amount;
    return await this.earningsRepository.save(earnings);
  }

  async completeSettlement(
    hostProfileId: string,
    amount: number,
    adminId = 'ADMIN',
  ): Promise<HostEarnings> {
    let host = await this.hostRepository.findOne({
      where: { id: hostProfileId },
    });
    if (!host) {
      host = await this.hostRepository.findOne({
        where: { userId: hostProfileId },
      });
    }

    if (host && adminId && (adminId === host.userId || adminId === host.id)) {
      throw new ForbiddenException(
        'Administrators cannot complete settlement payout for their own host profile',
      );
    }

    const targetProfileId = host ? host.id : hostProfileId;
    const earnings = await this.earningsRepository.findOne({
      where: { hostProfileId: targetProfileId },
    });
    if (!earnings) {
      throw new NotFoundException('Host earnings record not found');
    }

    earnings.pendingSettlements = Math.max(
      0,
      Number(earnings.pendingSettlements) - amount,
    );
    earnings.completedSettlements =
      Number(earnings.completedSettlements) + amount;
    const saved = await this.earningsRepository.save(earnings);

    await this.logAuditNote(
      targetProfileId,
      adminId,
      `Completed settlement payment of $${amount.toFixed(2)}`,
      'SETTLEMENT_COMPLETED',
    );

    return saved;
  }

  async getEarningsOverviewAdmin() {
    const allEarnings = await this.earningsRepository.find();
    const totalLifetime = allEarnings.reduce(
      (acc, e) => acc + Number(e.lifetimeEarnings),
      0,
    );
    const totalPending = allEarnings.reduce(
      (acc, e) => acc + Number(e.pendingSettlements),
      0,
    );
    const totalCompleted = allEarnings.reduce(
      (acc, e) => acc + Number(e.completedSettlements),
      0,
    );

    return {
      totalHostsWithEarnings: allEarnings.length,
      totalLifetimeEarnings: totalLifetime,
      totalPendingSettlements: totalPending,
      totalCompletedSettlements: totalCompleted,
      earningsList: allEarnings,
    };
  }

  // ==========================================
  // 5. HOST PERFORMANCE ANALYTICS
  // ==========================================

  private async getOrCreatePerformance(
    hostProfileId: string,
    userId: string,
  ): Promise<HostPerformance> {
    let perf = await this.performanceRepository.findOne({
      where: { hostProfileId },
    });
    if (!perf) {
      perf = this.performanceRepository.create({
        hostProfileId,
        userId,
        totalRoomsHosted: 0,
        totalAudience: 0,
        peakListeners: 0,
        avgSessionDurationMinutes: 0,
        giftsReceived: 0,
        coinsEarned: 0,
        diamondsEarned: 0,
        engagementScore: 85.0,
        audienceRetentionRate: 78.5,
        speakingTimeMinutes: 0,
      });
      perf = await this.performanceRepository.save(perf);
    }
    return perf;
  }

  async getPerformanceAnalytics(userId: string): Promise<HostPerformance> {
    const host = await this.getHostProfile(userId);
    return await this.getOrCreatePerformance(host.id, userId);
  }

  async getTopHosts(limit = 10): Promise<HostProfile[]> {
    return await this.hostRepository.find({
      where: { status: HostVerificationStatus.APPROVED },
      order: { performanceScore: 'DESC', hostLevel: 'DESC' },
      take: limit,
    });
  }

  // ==========================================
  // 6. HOST ROOM MANAGEMENT
  // ==========================================

  async createHostRoom(
    userId: string,
    dto: CreateHostRoomDto,
  ): Promise<HostRoom> {
    const host = await this.getHostProfile(userId);
    if (host.status !== HostVerificationStatus.APPROVED) {
      throw new BadRequestException(
        'Only approved hosts can schedule or create host rooms',
      );
    }

    const room = this.roomRepository.create({
      hostProfileId: host.id,
      userId,
      title: dto.title,
      category: dto.category || 'General',
      type: dto.type || 'INSTANT',
      status: dto.type === 'INSTANT' ? 'LIVE' : 'SCHEDULED',
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
      startedAt: dto.type === 'INSTANT' ? new Date() : null,
      isRecurring: dto.isRecurring || false,
      recurrenceRule: dto.recurrenceRule || null,
      isFeatured: dto.isFeatured || false,
    });

    const saved = await this.roomRepository.save(room);

    // Update host room count
    host.totalRoomsHosted = (host.totalRoomsHosted || 0) + 1;
    await this.hostRepository.save(host);

    return saved;
  }

  async getHostRoomHistory(userId: string): Promise<HostRoom[]> {
    const host = await this.getHostProfile(userId);
    return await this.roomRepository.find({
      where: { hostProfileId: host.id },
      order: { createdAt: 'DESC' },
    });
  }

  async getHostRoomAnalytics(roomId: string) {
    const room = await this.roomRepository.findOne({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Host room not found');

    return {
      roomId: room.id,
      title: room.title,
      status: room.status,
      peakListeners: room.peakListeners,
      totalDurationMinutes: room.totalDurationMinutes,
      coinsEarned: room.coinsEarned,
      createdAt: room.createdAt,
    };
  }

  async cancelHostRoom(userId: string, roomId: string): Promise<HostRoom> {
    const host = await this.getHostProfile(userId);
    const room = await this.roomRepository.findOne({
      where: { id: roomId, hostProfileId: host.id },
    });
    if (!room) throw new NotFoundException('Host room not found');

    room.status = 'CANCELLED';
    return await this.roomRepository.save(room);
  }

  async setFeaturedRoom(
    roomId: string,
    isFeatured: boolean,
  ): Promise<HostRoom> {
    const room = await this.roomRepository.findOne({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Host room not found');

    room.isFeatured = isFeatured;
    return await this.roomRepository.save(room);
  }

  // ==========================================
  // 7. HOST MODERATION TOOLS
  // ==========================================

  async performModerationAction(
    hostUserId: string,
    dto: HostModerationActionDto,
  ) {
    const host = await this.getHostProfile(hostUserId);

    const log = this.incidentRepository.create({
      hostProfileId: host.id,
      roomId: dto.roomId,
      targetUserId: dto.targetUserId,
      action: dto.action,
      reason: dto.reason || 'Host moderation action',
      durationMinutes: dto.durationMinutes || null,
    });
    await this.incidentRepository.save(log);

    this.eventsGateway.broadcastHostEvent('host:moderation_action', {
      hostUserId,
      roomId: dto.roomId,
      targetUserId: dto.targetUserId,
      action: dto.action,
      reason: dto.reason,
    });

    return {
      message: `Moderation action '${dto.action}' executed successfully against user ${dto.targetUserId}`,
      log,
    };
  }

  async getIncidentLogs(roomId: string): Promise<HostIncidentLog[]> {
    return await this.incidentRepository.find({
      where: { roomId },
      order: { createdAt: 'DESC' },
    });
  }

  // ==========================================
  // 8. HOST REWARDS
  // ==========================================

  async getAvailableRewards(userId: string): Promise<HostReward[]> {
    const host = await this.getHostProfile(userId);
    return await this.rewardRepository.find({
      where: { hostProfileId: host.id, status: 'AVAILABLE' },
      order: { createdAt: 'DESC' },
    });
  }

  async claimReward(userId: string, rewardId: string): Promise<HostReward> {
    const host = await this.getHostProfile(userId);
    const reward = await this.rewardRepository.findOne({
      where: { id: rewardId, hostProfileId: host.id },
    });
    if (!reward) throw new NotFoundException('Reward not found');

    if (reward.status === 'CLAIMED') {
      throw new ConflictException('Reward has already been claimed');
    }

    reward.status = 'CLAIMED';
    reward.claimedAt = new Date();
    const saved = await this.rewardRepository.save(reward);

    // Add to earnings
    await this.recordIncome(userId, 0, Number(reward.amount), 0);

    return saved;
  }

  async grantReward(
    hostProfileId: string,
    rewardName: string,
    amount: number,
    type = 'PERFORMANCE_BONUS',
    currency = 'DIAMONDS',
    adminId = 'ADMIN',
  ): Promise<HostReward> {
    let host = await this.hostRepository.findOne({
      where: { id: hostProfileId },
    });
    if (!host) {
      host = await this.hostRepository.findOne({
        where: { userId: hostProfileId },
      });
    }
    if (!host) throw new NotFoundException('Host profile not found');

    if (adminId && (adminId === host.userId || adminId === host.id)) {
      throw new ForbiddenException(
        'Administrators cannot grant rewards to their own host profile',
      );
    }

    const reward = this.rewardRepository.create({
      hostProfileId: host.id,
      userId: host.userId,
      rewardName,
      amount,
      type,
      currency,
      status: 'AVAILABLE',
    });
    const saved = await this.rewardRepository.save(reward);

    await this.logAuditNote(
      host.id,
      adminId,
      `Granted reward '${rewardName}' of ${amount} ${currency}`,
      'REWARD_GRANTED',
    );

    return saved;
  }

  // ==========================================
  // 11. REDIS CACHING HELPERS
  // ==========================================

  async cacheActiveHosts(): Promise<void> {
    if (!this.redisService) return;
    const activeHosts = await this.hostRepository.find({
      where: { status: HostVerificationStatus.APPROVED },
      take: 50,
    });
    await this.redisService.set(
      'host:active_hosts',
      JSON.stringify(activeHosts),
      600,
    );
  }

  async getCachedActiveHosts(): Promise<HostProfile[]> {
    if (!this.redisService) {
      return await this.hostRepository.find({
        where: { status: HostVerificationStatus.APPROVED },
      });
    }
    const cached = await this.redisService.get('host:active_hosts');
    if (cached) return JSON.parse(cached);

    const activeHosts = await this.hostRepository.find({
      where: { status: HostVerificationStatus.APPROVED },
    });
    await this.redisService.set(
      'host:active_hosts',
      JSON.stringify(activeHosts),
      600,
    );
    return activeHosts;
  }
}
