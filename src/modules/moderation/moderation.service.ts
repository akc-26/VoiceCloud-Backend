import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, Like } from 'typeorm';
import { BlockedUser } from './entities/blocked-user.entity';
import { Report, ReportStatus } from './entities/report.entity';
import {
  ModerationAction,
  ModerationActionType,
} from './entities/moderation-action.entity';
import { ModerationNote } from './entities/moderation-note.entity';
import { BlockUserDto } from './dto/block-user.dto';
import { CreateReportDto } from './dto/create-report.dto';
import { QueryReportDto } from './dto/query-report.dto';
import { ApproveReportDto, DismissReportDto } from './dto/approve-report.dto';
import { SuspendUserDto } from './dto/suspend-user.dto';
import { BanUserDto } from './dto/ban-user.dto';
import { MuteUserDto } from './dto/mute-user.dto';
import { WarnUserDto, CreateNoteDto } from './dto/warn-user.dto';
import { EventsGateway } from '../../common/events/events.gateway';

@Injectable()
export class ModerationService {
  constructor(
    @InjectRepository(BlockedUser)
    private readonly blockedUserRepository: Repository<BlockedUser>,
    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,
    @InjectRepository(ModerationAction)
    private readonly moderationActionRepository: Repository<ModerationAction>,
    @InjectRepository(ModerationNote)
    private readonly moderationNoteRepository: Repository<ModerationNote>,
    private readonly eventsGateway: EventsGateway,
  ) {}

  // ================= User Blocking System =================

  async blockUser(blockerId: string, dto: BlockUserDto): Promise<BlockedUser> {
    if (blockerId === dto.targetUserId) {
      throw new BadRequestException('You cannot block yourself');
    }

    const existing = await this.blockedUserRepository.findOne({
      where: { blockerId, blockedId: dto.targetUserId },
    });

    if (existing) {
      throw new ConflictException('User is already blocked');
    }

    const block = this.blockedUserRepository.create({
      blockerId,
      blockedId: dto.targetUserId,
      reason: dto.reason ?? undefined,
    });

    const saved = await this.blockedUserRepository.save(block);

    this.eventsGateway.broadcastUserBlockEvent('user:blocked', {
      blockerId,
      blockedId: dto.targetUserId,
    });

    return saved;
  }

  async unblockUser(
    blockerId: string,
    targetUserId: string,
  ): Promise<{ success: boolean }> {
    const block = await this.blockedUserRepository.findOne({
      where: { blockerId, blockedId: targetUserId },
    });

    if (!block) {
      throw new NotFoundException('Block relationship not found');
    }

    await this.blockedUserRepository.remove(block);

    this.eventsGateway.broadcastUserBlockEvent('user:unblocked', {
      blockerId,
      blockedId: targetUserId,
    });

    return { success: true };
  }

  async listBlockedUsers(blockerId: string): Promise<BlockedUser[]> {
    return await this.blockedUserRepository.find({
      where: { blockerId },
      order: { createdAt: 'DESC' },
    });
  }

  async isBlocked(userAId: string, userBId: string): Promise<boolean> {
    const count = await this.blockedUserRepository.count({
      where: [
        { blockerId: userAId, blockedId: userBId },
        { blockerId: userBId, blockedId: userAId },
      ],
    });
    return count > 0;
  }

  // ================= User Reporting System =================

  async createReport(
    reporterId: string,
    dto: CreateReportDto,
  ): Promise<Report> {
    const report = this.reportRepository.create({
      reporterId,
      targetType: dto.targetType,
      targetId: dto.targetId,
      reason: dto.reason,
      description: dto.description ?? undefined,
      status: ReportStatus.PENDING,
    });

    const saved = await this.reportRepository.save(report);

    this.eventsGateway.broadcastReportEvent('report:submitted', {
      reportId: saved.id,
      reporterId,
      targetType: saved.targetType,
      targetId: saved.targetId,
      reason: saved.reason,
    });

    return saved;
  }

  async getUserReports(reporterId: string): Promise<Report[]> {
    return await this.reportRepository.find({
      where: { reporterId },
      order: { createdAt: 'DESC' },
    });
  }

  // ================= Admin Moderation =================

  async getReports(query: QueryReportDto): Promise<{
    data: Report[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 20;
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<Report> = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.targetType) {
      where.targetType = query.targetType;
    }

    if (query.reason) {
      where.reason = query.reason;
    }

    if (query.search) {
      where.targetId = Like(`%${query.search}%`);
    }

    const [data, total] = await this.reportRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getReportById(id: string): Promise<Report> {
    const report = await this.reportRepository.findOne({ where: { id } });
    if (!report) {
      throw new NotFoundException(`Report with ID ${id} not found`);
    }
    return report;
  }

  async approveReport(
    id: string,
    moderatorId: string,
    dto: ApproveReportDto,
  ): Promise<Report> {
    const report = await this.getReportById(id);
    report.status = ReportStatus.APPROVED;
    report.resolutionNotes = dto.resolutionNotes ?? 'Approved by moderator';
    report.reviewedById = moderatorId;
    report.reviewedAt = new Date();

    const updated = await this.reportRepository.save(report);

    // Audit log
    const action = this.moderationActionRepository.create({
      targetUserId: report.targetId,
      moderatorId,
      actionType: ModerationActionType.APPROVE_REPORT,
      reason: `Report ${id} approved`,
      notes: dto.resolutionNotes ?? null,
    });
    await this.moderationActionRepository.save(action);

    this.eventsGateway.broadcastModerationEvent('moderation:update', {
      action: 'report_approved',
      reportId: id,
      moderatorId,
    });

    return updated;
  }

  async dismissReport(
    id: string,
    moderatorId: string,
    dto: DismissReportDto,
  ): Promise<Report> {
    const report = await this.getReportById(id);
    report.status = ReportStatus.DISMISSED;
    report.resolutionNotes = dto.resolutionNotes ?? 'Dismissed by moderator';
    report.reviewedById = moderatorId;
    report.reviewedAt = new Date();

    const updated = await this.reportRepository.save(report);

    const action = this.moderationActionRepository.create({
      targetUserId: report.targetId,
      moderatorId,
      actionType: ModerationActionType.DISMISS_REPORT,
      reason: `Report ${id} dismissed`,
      notes: dto.resolutionNotes ?? null,
    });
    await this.moderationActionRepository.save(action);

    this.eventsGateway.broadcastModerationEvent('moderation:update', {
      action: 'report_dismissed',
      reportId: id,
      moderatorId,
    });

    return updated;
  }

  async suspendUser(
    moderatorId: string,
    userId: string,
    dto: SuspendUserDto,
  ): Promise<ModerationAction> {
    const isPermanent = dto.isPermanent ?? false;
    let expiresAt: Date | null = null;

    if (!isPermanent && dto.durationMinutes) {
      expiresAt = new Date(Date.now() + dto.durationMinutes * 60 * 1000);
    }

    const action = this.moderationActionRepository.create({
      targetUserId: userId,
      moderatorId,
      actionType: ModerationActionType.SUSPEND,
      reason: dto.reason,
      durationMinutes: dto.durationMinutes ?? null,
      expiresAt,
      isPermanent,
      notes: dto.notes ?? null,
    });

    const saved = await this.moderationActionRepository.save(action);

    this.eventsGateway.broadcastModerationEvent('moderation:update', {
      action: 'user_suspended',
      userId,
      moderatorId,
      isPermanent,
      expiresAt,
    });

    return saved;
  }

  async banUser(
    moderatorId: string,
    userId: string,
    dto: BanUserDto,
  ): Promise<ModerationAction> {
    const isPermanent = dto.isPermanent ?? true;
    let expiresAt: Date | null = null;

    if (!isPermanent && dto.durationMinutes) {
      expiresAt = new Date(Date.now() + dto.durationMinutes * 60 * 1000);
    }

    const action = this.moderationActionRepository.create({
      targetUserId: userId,
      moderatorId,
      actionType: ModerationActionType.BAN,
      reason: dto.reason,
      durationMinutes: dto.durationMinutes ?? null,
      expiresAt,
      isPermanent,
      notes: dto.notes ?? null,
    });

    const saved = await this.moderationActionRepository.save(action);

    this.eventsGateway.broadcastModerationEvent('moderation:update', {
      action: 'user_banned',
      userId,
      moderatorId,
      isPermanent,
      expiresAt,
    });

    return saved;
  }

  async muteUser(
    moderatorId: string,
    userId: string,
    dto: MuteUserDto,
  ): Promise<ModerationAction> {
    const expiresAt = new Date(Date.now() + dto.durationMinutes * 60 * 1000);

    const action = this.moderationActionRepository.create({
      targetUserId: userId,
      moderatorId,
      actionType: ModerationActionType.MUTE,
      reason: dto.reason,
      durationMinutes: dto.durationMinutes,
      expiresAt,
      isPermanent: false,
      notes: dto.notes ?? null,
    });

    const saved = await this.moderationActionRepository.save(action);

    this.eventsGateway.broadcastModerationEvent('moderation:update', {
      action: 'user_muted',
      userId,
      moderatorId,
      durationMinutes: dto.durationMinutes,
      expiresAt,
    });

    return saved;
  }

  async warnUser(
    moderatorId: string,
    userId: string,
    dto: WarnUserDto,
  ): Promise<ModerationAction> {
    const action = this.moderationActionRepository.create({
      targetUserId: userId,
      moderatorId,
      actionType: ModerationActionType.WARN,
      reason: dto.reason,
      durationMinutes: null,
      expiresAt: null,
      isPermanent: false,
      notes: dto.notes ?? null,
    });

    const saved = await this.moderationActionRepository.save(action);

    this.eventsGateway.broadcastModerationEvent('moderation:update', {
      action: 'user_warned',
      userId,
      moderatorId,
      reason: dto.reason,
    });

    return saved;
  }

  async getUserWarnings(userId: string): Promise<ModerationAction[]> {
    return await this.moderationActionRepository.find({
      where: {
        targetUserId: userId,
        actionType: ModerationActionType.WARN,
      },
      order: { createdAt: 'DESC' },
    });
  }

  async getUserStatus(userId: string): Promise<{
    isBanned: boolean;
    isSuspended: boolean;
    isMuted: boolean;
    activeAction?: ModerationAction;
  }> {
    const actions = await this.moderationActionRepository.find({
      where: { targetUserId: userId },
      order: { createdAt: 'DESC' },
    });

    const now = new Date();
    let isBanned = false;
    let isSuspended = false;
    let isMuted = false;
    let activeAction: ModerationAction | undefined;

    for (const action of actions) {
      if (action.actionType === ModerationActionType.BAN) {
        if (
          action.isPermanent ||
          (action.expiresAt && action.expiresAt > now)
        ) {
          isBanned = true;
          activeAction = action;
          break;
        }
      } else if (action.actionType === ModerationActionType.SUSPEND) {
        if (
          action.isPermanent ||
          (action.expiresAt && action.expiresAt > now)
        ) {
          isSuspended = true;
          activeAction = activeAction || action;
        }
      } else if (action.actionType === ModerationActionType.MUTE) {
        if (action.expiresAt && action.expiresAt > now) {
          isMuted = true;
          activeAction = activeAction || action;
        }
      }
    }

    return {
      isBanned,
      isSuspended,
      isMuted,
      activeAction,
    };
  }

  async addNote(authorId: string, dto: CreateNoteDto): Promise<ModerationNote> {
    const note = this.moderationNoteRepository.create({
      targetId: dto.targetId,
      authorId,
      note: dto.note,
    });
    return await this.moderationNoteRepository.save(note);
  }

  async getNotes(targetId: string): Promise<ModerationNote[]> {
    return await this.moderationNoteRepository.find({
      where: { targetId },
      order: { createdAt: 'DESC' },
    });
  }

  async getAuditTrail(
    page = 1,
    limit = 20,
  ): Promise<{
    data: ModerationAction[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;
    const [data, total] = await this.moderationActionRepository.findAndCount({
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }
}
