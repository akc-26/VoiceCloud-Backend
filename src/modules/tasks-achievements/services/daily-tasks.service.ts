import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskDefinition, TaskPeriod } from '../entities/task-definition.entity';
import {
  UserTaskProgress,
  TaskStatus,
} from '../entities/user-task-progress.entity';
import { CreateTaskDefinitionDto } from '../dto/create-task-definition.dto';
import { UpdateTaskDefinitionDto } from '../dto/update-task-definition.dto';
import { TaskQueryDto } from '../dto/task-query.dto';
import { RewardEngineService } from './reward-engine.service';
import { XpEngineService } from './xp-engine.service';
import { AchievementService } from './achievement.service';
import { StreakService } from './streak.service';
import { StreakType } from '../entities/user-streak.entity';
import { EventsGateway } from '../../../common/events/events.gateway';

@Injectable()
export class DailyTasksService {
  private readonly logger = new Logger(DailyTasksService.name);

  constructor(
    @InjectRepository(TaskDefinition)
    private readonly taskDefRepo: Repository<TaskDefinition>,
    @InjectRepository(UserTaskProgress)
    private readonly userTaskProgressRepo: Repository<UserTaskProgress>,
    private readonly rewardEngineService: RewardEngineService,
    private readonly xpEngineService: XpEngineService,
    private readonly achievementService: AchievementService,
    private readonly streakService: StreakService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  public getPeriodIdentifier(period: TaskPeriod, date = new Date()): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');

    if (period === TaskPeriod.DAILY) {
      return `${year}-${month}-${day}`;
    }

    if (period === TaskPeriod.MONTHLY) {
      return `${year}-${month}`;
    }

    // Weekly
    const d = new Date(
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
    );
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil(
      ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
    );
    return `${year}-W${String(weekNo).padStart(2, '0')}`;
  }

  async getUserTasks(userId: string, query?: TaskQueryDto) {
    const periodFilter = query?.period;
    const whereCondition: Record<string, unknown> = { isActive: true };
    if (periodFilter) {
      whereCondition.resetPeriod = periodFilter;
    }

    const taskDefs = await this.taskDefRepo.find({
      where: whereCondition,
      order: { displayOrder: 'ASC', createdAt: 'DESC' },
    });

    const results = [];

    for (const def of taskDefs) {
      const periodId = this.getPeriodIdentifier(def.resetPeriod);
      let progress = await this.userTaskProgressRepo.findOne({
        where: { userId, taskId: def.id, periodIdentifier: periodId },
      });

      if (!progress) {
        progress = this.userTaskProgressRepo.create({
          userId,
          taskId: def.id,
          currentCount: 0,
          targetCount: def.targetCount,
          status: TaskStatus.ACTIVE,
          periodIdentifier: periodId,
        });
        progress = await this.userTaskProgressRepo.save(progress);
      }

      results.push({
        task: def,
        progress: {
          currentCount: progress.currentCount,
          targetCount: progress.targetCount,
          status: progress.status,
          completedAt: progress.completedAt,
          claimedAt: progress.claimedAt,
          periodIdentifier: progress.periodIdentifier,
        },
      });
    }

    return results;
  }

  async trackTaskEvent(userId: string, eventKey: string, count = 1) {
    // 1. Find all active task definitions matching this eventKey
    const taskDefs = await this.taskDefRepo.find({
      where: { eventKey, isActive: true },
    });

    const updatedTasks = [];

    for (const def of taskDefs) {
      const periodId = this.getPeriodIdentifier(def.resetPeriod);
      let progress = await this.userTaskProgressRepo.findOne({
        where: { userId, taskId: def.id, periodIdentifier: periodId },
      });

      if (!progress) {
        progress = this.userTaskProgressRepo.create({
          userId,
          taskId: def.id,
          currentCount: 0,
          targetCount: def.targetCount,
          status: TaskStatus.ACTIVE,
          periodIdentifier: periodId,
        });
      }

      if (
        progress.status === TaskStatus.ACTIVE ||
        progress.status === TaskStatus.LOCKED
      ) {
        progress.status = TaskStatus.ACTIVE;
        progress.currentCount += count;

        if (progress.currentCount >= progress.targetCount) {
          progress.status = TaskStatus.COMPLETED;
          progress.completedAt = new Date();

          this.logger.log(
            `User ${userId} completed task: ${def.title} (${def.id})`,
          );

          if (this.eventsGateway?.server) {
            this.eventsGateway.server.emit('task_completed', {
              userId,
              taskId: def.id,
              taskTitle: def.title,
              resetPeriod: def.resetPeriod,
              rewardCoins: def.rewardCoins,
              rewardDiamonds: def.rewardDiamonds,
              rewardXp: def.rewardXp,
              timestamp: new Date().toISOString(),
            });
          }
        }

        progress = await this.userTaskProgressRepo.save(progress);
        updatedTasks.push({ task: def, progress });
      }
    }

    // 2. Check cumulative count for permanent achievements
    // Calculate total count across all historical progress for this eventKey
    const allMatchingTaskIds = taskDefs.map((t) => t.id);
    let totalCount = count;
    if (allMatchingTaskIds.length > 0) {
      const sumResult = await this.userTaskProgressRepo
        .createQueryBuilder('p')
        .select('SUM(p.currentCount)', 'total')
        .where('p.userId = :userId', { userId })
        .andWhere('p.taskId IN (:...ids)', { ids: allMatchingTaskIds })
        .getRawOne();
      totalCount = parseInt(sumResult?.total || '0', 10);
    }

    await this.achievementService.checkAchievementsForEvent(
      userId,
      eventKey,
      totalCount,
    );

    // 3. Trigger streak recording if applicable
    if (eventKey === 'login') {
      await this.streakService.recordStreakActivity(userId, StreakType.LOGIN);
    } else if (eventKey === 'host_room' || eventKey === 'create_room') {
      await this.streakService.recordStreakActivity(userId, StreakType.HOSTING);
    } else if (eventKey === 'listen_room' || eventKey === 'stay_room_min') {
      await this.streakService.recordStreakActivity(
        userId,
        StreakType.LISTENING,
      );
    } else if (eventKey === 'send_gifts') {
      await this.streakService.recordStreakActivity(userId, StreakType.GIFTING);
    } else if (eventKey === 'chat_messages') {
      await this.streakService.recordStreakActivity(userId, StreakType.CHAT);
    }

    return { success: true, eventKey, updatedTasksCount: updatedTasks.length };
  }

  async claimTaskReward(userId: string, taskId: string) {
    const taskDef = await this.taskDefRepo.findOne({
      where: { id: taskId, isActive: true },
    });
    if (!taskDef) {
      throw new NotFoundException(`Task definition ${taskId} not found`);
    }

    const periodId = this.getPeriodIdentifier(taskDef.resetPeriod);
    const progress = await this.userTaskProgressRepo.findOne({
      where: { userId, taskId, periodIdentifier: periodId },
    });

    if (!progress) {
      throw new BadRequestException('No task progress recorded for user');
    }

    if (progress.status === TaskStatus.CLAIMED) {
      throw new BadRequestException('Task reward already claimed');
    }

    if (progress.status !== TaskStatus.COMPLETED) {
      throw new BadRequestException('Task is not completed yet');
    }

    progress.status = TaskStatus.CLAIMED;
    progress.claimedAt = new Date();
    await this.userTaskProgressRepo.save(progress);

    // Distribute rewards
    const auditLogs = await this.rewardEngineService.distributeReward(
      userId,
      {
        coins: taskDef.rewardCoins,
        diamonds: taskDef.rewardDiamonds,
        xp: taskDef.rewardXp,
        vipDays: taskDef.rewardVipDays,
        profileFrame: taskDef.rewardProfileFrame,
        chatBubble: taskDef.rewardChatBubble,
        entranceEffect: taskDef.rewardEntranceEffect,
        exclusiveSticker: taskDef.rewardSticker,
        badge: taskDef.rewardBadge,
        metadata: `Task reward claimed: ${taskDef.title}`,
      },
      'task_claim',
      taskDef.id,
    );

    if (taskDef.rewardXp > 0) {
      await this.xpEngineService.addXp(userId, taskDef.rewardXp, 'task_claim');
    }

    return {
      success: true,
      taskId: taskDef.id,
      taskTitle: taskDef.title,
      claimedAt: progress.claimedAt,
      auditLogs,
    };
  }

  // Admin CRUD for Task Definitions
  async createTaskDefinition(dto: CreateTaskDefinitionDto) {
    const def = this.taskDefRepo.create(dto);
    return this.taskDefRepo.save(def);
  }

  async updateTaskDefinition(id: string, dto: UpdateTaskDefinitionDto) {
    const def = await this.taskDefRepo.findOne({ where: { id } });
    if (!def) {
      throw new NotFoundException(`Task definition ${id} not found`);
    }
    Object.assign(def, dto);
    return this.taskDefRepo.save(def);
  }

  async deleteTaskDefinition(id: string) {
    const result = await this.taskDefRepo.delete({ id });
    if (result.affected === 0) {
      throw new NotFoundException(`Task definition ${id} not found`);
    }
    return { success: true, id };
  }

  async listTaskDefinitions(query?: TaskQueryDto) {
    const where: Record<string, unknown> = {};
    if (query?.period) {
      where.resetPeriod = query.period;
    }
    if (query?.eventKey) {
      where.eventKey = query.eventKey;
    }

    return this.taskDefRepo.find({
      where,
      order: { displayOrder: 'ASC', createdAt: 'DESC' },
    });
  }
}
