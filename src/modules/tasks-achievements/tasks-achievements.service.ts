import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RewardAuditLog } from './entities/reward-audit-log.entity';
import { TaskDefinition } from './entities/task-definition.entity';
import { UserTaskProgress } from './entities/user-task-progress.entity';
import { AchievementDefinition } from './entities/achievement-definition.entity';
import { UserAchievement } from './entities/user-achievement.entity';
import { UserStreak } from './entities/user-streak.entity';
import { UserXpProgress } from './entities/user-xp-progress.entity';
import { DailyCheckIn } from './entities/daily-check-in.entity';
import { SeasonalEvent } from './entities/seasonal-event.entity';
import { RedisService } from '../../redis/redis.service';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';
import { DailyTasksService } from './services/daily-tasks.service';
import { AchievementService } from './services/achievement.service';
import { StreakService } from './services/streak.service';
import { DailyCheckInService } from './services/daily-checkin.service';
import { XpEngineService } from './services/xp-engine.service';
import { SeasonalEventService } from './services/seasonal-event.service';

@Injectable()
export class TasksAchievementsService {
  private readonly logger = new Logger(TasksAchievementsService.name);

  constructor(
    @InjectRepository(RewardAuditLog)
    private readonly auditLogRepo: Repository<RewardAuditLog>,
    @InjectRepository(TaskDefinition)
    private readonly taskDefRepo: Repository<TaskDefinition>,
    @InjectRepository(UserTaskProgress)
    private readonly userTaskRepo: Repository<UserTaskProgress>,
    @InjectRepository(AchievementDefinition)
    private readonly achievementDefRepo: Repository<AchievementDefinition>,
    @InjectRepository(UserAchievement)
    private readonly userAchievementRepo: Repository<UserAchievement>,
    @InjectRepository(UserStreak)
    private readonly userStreakRepo: Repository<UserStreak>,
    @InjectRepository(UserXpProgress)
    private readonly userXpRepo: Repository<UserXpProgress>,
    @InjectRepository(DailyCheckIn)
    private readonly checkInRepo: Repository<DailyCheckIn>,
    @InjectRepository(SeasonalEvent)
    private readonly seasonalRepo: Repository<SeasonalEvent>,
    private readonly redisService: RedisService,
    private readonly dailyTasksService: DailyTasksService,
    private readonly achievementService: AchievementService,
    private readonly streakService: StreakService,
    private readonly dailyCheckInService: DailyCheckInService,
    private readonly xpEngineService: XpEngineService,
    private readonly seasonalEventService: SeasonalEventService,
  ) {}

  async getAuditLogs(query?: AuditLogQueryDto) {
    const page = query?.page || 1;
    const limit = query?.limit || 20;
    const skip = (page - 1) * limit;

    const queryBuilder = this.auditLogRepo
      .createQueryBuilder('log')
      .orderBy('log.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (query?.userId) {
      queryBuilder.andWhere('log.userId = :userId', { userId: query.userId });
    }
    if (query?.rewardType) {
      queryBuilder.andWhere('log.rewardType = :rewardType', {
        rewardType: query.rewardType,
      });
    }
    if (query?.source) {
      queryBuilder.andWhere('log.source = :source', { source: query.source });
    }

    const [items, total] = await queryBuilder.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUserCompleteProgress(userId: string) {
    const xp = await this.xpEngineService.getUserXpProgress(userId);
    const tasks = await this.dailyTasksService.getUserTasks(userId);
    const achievements =
      await this.achievementService.getAllAchievements(userId);
    const streaks = await this.streakService.getUserStreaks(userId);
    const checkIn = await this.dailyCheckInService.getCheckInStatus(userId);
    const activeSeason = await this.seasonalEventService.getActiveSeason();

    return {
      userId,
      xp,
      tasks,
      achievements,
      streaks,
      checkIn,
      activeSeason,
    };
  }

  async getAnalytics() {
    const totalTaskDefs = await this.taskDefRepo.count();
    const totalActiveTasks = await this.taskDefRepo.count({
      where: { isActive: true },
    });
    const totalCompletions = await this.userTaskRepo.count({
      where: { status: 'completed' as any },
    });
    const totalClaimedTasks = await this.userTaskRepo.count({
      where: { status: 'claimed' as any },
    });

    const totalAchievementDefs = await this.achievementDefRepo.count();
    const totalUnlockedAchievements = await this.userAchievementRepo.count();

    const totalAuditLogs = await this.auditLogRepo.count();

    const sumCoinsResult = await this.auditLogRepo
      .createQueryBuilder('log')
      .select('SUM(log.amount)', 'total')
      .where('log.rewardType = :t', { t: 'coins' })
      .getRawOne();

    const sumDiamondsResult = await this.auditLogRepo
      .createQueryBuilder('log')
      .select('SUM(log.amount)', 'total')
      .where('log.rewardType = :t', { t: 'diamonds' })
      .getRawOne();

    return {
      tasks: {
        totalDefinitions: totalTaskDefs,
        activeDefinitions: totalActiveTasks,
        completedCount: totalCompletions,
        claimedCount: totalClaimedTasks,
      },
      achievements: {
        totalDefinitions: totalAchievementDefs,
        totalUnlockedCount: totalUnlockedAchievements,
      },
      rewards: {
        totalDistributedLogs: totalAuditLogs,
        totalCoinsDistributed: parseInt(sumCoinsResult?.total || '0', 10),
        totalDiamondsDistributed: parseInt(sumDiamondsResult?.total || '0', 10),
      },
    };
  }

  async manualReset(period: 'daily' | 'weekly' | 'monthly') {
    this.logger.log(`Manual reset triggered for period: ${period}`);
    // Optional Redis cache invalidation
    if (this.redisService) {
      await this.redisService.del(`tasks:active:${period}`);
    }
    return {
      success: true,
      message: `Manual ${period} task reset executed successfully`,
    };
  }
}
