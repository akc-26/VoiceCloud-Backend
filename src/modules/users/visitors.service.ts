import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ProfileVisitor } from './entities/profile-visitor.entity';
import { User } from './entities/user.entity';
import { UserSettings } from './entities/user-settings.entity';
import { RecordVisitDto } from './dto/record-visit.dto';

@Injectable()
export class ProfileVisitorsService {
  private readonly logger = new Logger(ProfileVisitorsService.name);

  constructor(
    @InjectRepository(ProfileVisitor)
    private readonly visitorRepository: Repository<ProfileVisitor>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserSettings)
    private readonly settingsRepository: Repository<UserSettings>,
  ) {}

  async recordVisit(
    targetUserId: string,
    visitorUserId: string,
    dto?: RecordVisitDto,
  ) {
    if (targetUserId === visitorUserId) {
      return { skipped: true, reason: 'self-visit' };
    }

    const targetUser = await this.userRepository.findOne({
      where: { id: targetUserId },
    });
    if (!targetUser) {
      throw new NotFoundException('Target user not found');
    }

    // Check target settings
    const targetSettings = await this.settingsRepository.findOne({
      where: { userId: targetUserId },
    });
    if (targetSettings && targetSettings.allowVisitorTracking === false) {
      return { skipped: true, reason: 'visitor-tracking-disabled-by-target' };
    }

    // Check visitor settings
    const visitorSettings = await this.settingsRepository.findOne({
      where: { userId: visitorUserId },
    });
    const isAnonymous =
      dto?.isAnonymous ?? visitorSettings?.anonymousVisiting ?? false;

    let visitorRecord = await this.visitorRepository.findOne({
      where: { targetUserId, visitorUserId },
    });

    if (visitorRecord) {
      visitorRecord.visitCount += 1;
      visitorRecord.isAnonymous = isAnonymous;
      visitorRecord.visitedAt = new Date();
      if (dto?.metadata) {
        visitorRecord.metadata = { ...visitorRecord.metadata, ...dto.metadata };
      }
    } else {
      visitorRecord = this.visitorRepository.create({
        targetUserId,
        visitorUserId,
        isAnonymous,
        visitCount: 1,
        metadata: dto?.metadata || {},
      });
    }

    await this.visitorRepository.save(visitorRecord);

    // Update target popularity score
    targetUser.popularityScore = (targetUser.popularityScore || 0) + 1;
    await this.userRepository.save(targetUser);

    return {
      success: true,
      targetUserId,
      isAnonymous,
      visitedAt: visitorRecord.visitedAt,
    };
  }

  async getVisitorHistory(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [visits, total] = await this.visitorRepository.findAndCount({
      where: { targetUserId: userId },
      order: { visitedAt: 'DESC' },
      skip,
      take: limit,
    });

    // Populate visitor details for non-anonymous visits
    const visitorIds = visits
      .filter((v) => !v.isAnonymous)
      .map((v) => v.visitorUserId);

    let visitorsMap = new Map<string, Partial<User>>();
    if (visitorIds.length > 0) {
      const visitorUsers = await this.userRepository.findBy({
        id: In(visitorIds),
      });
      visitorsMap = new Map(
        visitorUsers.map((u) => [
          u.id,
          {
            id: u.id,
            username: u.username,
            displayName: u.displayName,
            avatarUrl: u.avatarUrl,
            wealthLevel: u.wealthLevel || 1,
            charmLevel: u.charmLevel || 1,
            isVerified: u.isVerified,
            isVip: u.isVip,
            vipBadge: u.vipBadge,
          },
        ]),
      );
    }

    const data = visits.map((visit) => {
      if (visit.isAnonymous) {
        return {
          id: visit.id,
          isAnonymous: true,
          visitedAt: visit.visitedAt,
          visitCount: visit.visitCount,
          visitor: {
            displayName: 'Anonymous Visitor',
            avatarUrl: null,
          },
        };
      }
      return {
        id: visit.id,
        isAnonymous: false,
        visitedAt: visit.visitedAt,
        visitCount: visit.visitCount,
        visitor: visitorsMap.get(visit.visitorUserId) || {
          id: visit.visitorUserId,
          displayName: 'Unknown User',
        },
      };
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getVisitorStats(userId: string) {
    const totalVisitsResult = await this.visitorRepository
      .createQueryBuilder('v')
      .select('SUM(v.visitCount)', 'sum')
      .where('v.targetUserId = :userId', { userId })
      .getRawOne();

    const uniqueVisitorsCount = await this.visitorRepository.count({
      where: { targetUserId: userId },
    });

    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const visitsToday = await this.visitorRepository
      .createQueryBuilder('v')
      .where('v.targetUserId = :userId', { userId })
      .andWhere('v.visitedAt >= :todayStart', { todayStart })
      .getCount();

    const visitsThisWeek = await this.visitorRepository
      .createQueryBuilder('v')
      .where('v.targetUserId = :userId', { userId })
      .andWhere('v.visitedAt >= :weekAgo', { weekAgo })
      .getCount();

    const topVisitorsRaw = await this.visitorRepository.find({
      where: { targetUserId: userId, isAnonymous: false },
      order: { visitCount: 'DESC' },
      take: 5,
    });

    const topVisitorIds = topVisitorsRaw.map((v) => v.visitorUserId);
    let topVisitors: any[] = [];
    if (topVisitorIds.length > 0) {
      const users = await this.userRepository.findBy({ id: In(topVisitorIds) });
      const userMap = new Map(users.map((u) => [u.id, u]));
      topVisitors = topVisitorsRaw.map((v) => ({
        user: userMap.get(v.visitorUserId),
        visitCount: v.visitCount,
        lastVisitedAt: v.visitedAt,
      }));
    }

    return {
      totalVisits: parseInt(totalVisitsResult?.sum || '0', 10),
      uniqueVisitors: uniqueVisitorsCount,
      visitsToday,
      visitsThisWeek,
      topVisitors,
    };
  }

  async deleteVisitorRecord(userId: string, visitorRecordId: string) {
    const record = await this.visitorRepository.findOne({
      where: { id: visitorRecordId, targetUserId: userId },
    });
    if (!record) {
      throw new NotFoundException('Visitor record not found');
    }
    await this.visitorRepository.remove(record);
    return { success: true };
  }

  // Admin APIs
  async adminGetVisitorLogs(page = 1, limit = 50, targetUserId?: string) {
    const skip = (page - 1) * limit;
    const query = this.visitorRepository.createQueryBuilder('v');

    if (targetUserId) {
      query.where('v.targetUserId = :targetUserId', { targetUserId });
    }

    query.orderBy('v.visitedAt', 'DESC').skip(skip).take(limit);

    const [records, total] = await query.getManyAndCount();
    const userIds = [...new Set(records.flatMap((record) => [record.targetUserId, record.visitorUserId]).filter(Boolean))];
    const users = userIds.length ? await this.userRepository.findBy({ id: In(userIds) }) : [];
    const userMap = new Map(users.map((user) => [user.id, user]));
    const data = records.map((record) => {
      const target = userMap.get(record.targetUserId);
      const visitor = userMap.get(record.visitorUserId);
      return {
        ...record,
        targetUserName: target?.displayName || target?.username || 'Unknown User',
        targetUsername: target?.username || null,
        visitorUserName: record.isAnonymous ? 'Anonymous Visitor' : visitor?.displayName || visitor?.username || 'Unknown User',
        visitorUsername: record.isAnonymous ? null : visitor?.username || null,
      };
    });
    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async adminGetVisitorStats() {
    const totalRecords = await this.visitorRepository.count();
    const totalVisitsRaw = await this.visitorRepository
      .createQueryBuilder('v')
      .select('SUM(v.visitCount)', 'sum')
      .getRawOne();
    const anonymousVisits = await this.visitorRepository.count({
      where: { isAnonymous: true },
    });

    return {
      totalVisitorRecords: totalRecords,
      totalVisits: parseInt(totalVisitsRaw?.sum || '0', 10),
      anonymousVisits,
    };
  }
}
