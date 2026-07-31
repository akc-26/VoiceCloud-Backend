import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../queue.constants';
import { TasksAchievementsService } from '../../modules/tasks-achievements/tasks-achievements.service';
import { DailyTasksService } from '../../modules/tasks-achievements/services/daily-tasks.service';
import { SeasonalEventService } from '../../modules/tasks-achievements/services/seasonal-event.service';
import { RewardEngineService } from '../../modules/tasks-achievements/services/reward-engine.service';
import { StreakService } from '../../modules/tasks-achievements/services/streak.service';
import { StreakType } from '../../modules/tasks-achievements/entities/user-streak.entity';

export interface TasksJobData {
  action:
    | 'daily_reset'
    | 'weekly_reset'
    | 'monthly_reset'
    | 'achievement_check'
    | 'xp_calculation'
    | 'reward_distribution'
    | 'season_rollover'
    | 'streak_update';
  userId?: string;
  payload?: any;
}

@Injectable()
@Processor(QUEUE_NAMES.TASKS)
export class TasksProcessor extends WorkerHost {
  private readonly logger = new Logger(TasksProcessor.name);

  constructor(
    private readonly tasksAchievementsService: TasksAchievementsService,
    private readonly dailyTasksService: DailyTasksService,
    private readonly seasonalEventService: SeasonalEventService,
    private readonly rewardEngineService: RewardEngineService,
    private readonly streakService: StreakService,
  ) {
    super();
  }

  async process(job: Job<TasksJobData, any, string>): Promise<any> {
    const startTime = Date.now();
    this.logger.log(
      `[TasksProcessor] Processing tasks job ${job.id} (${job.name}) - Action: ${job.data.action}`,
    );

    try {
      const { action, userId, payload } = job.data;
      let result: any = { success: true };

      switch (action) {
        case 'daily_reset':
          result = await this.tasksAchievementsService.manualReset('daily');
          break;

        case 'weekly_reset':
          result = await this.tasksAchievementsService.manualReset('weekly');
          break;

        case 'monthly_reset':
          result = await this.tasksAchievementsService.manualReset('monthly');
          break;

        case 'season_rollover':
          result = await this.seasonalEventService.triggerSeasonRollover();
          break;

        case 'reward_distribution':
          if (userId && payload) {
            result = await this.rewardEngineService.distributeReward(
              userId,
              payload,
              payload.source || 'queue_job',
              payload.sourceId,
            );
          }
          break;

        case 'streak_update':
          if (userId && payload?.streakType) {
            result = await this.streakService.recordStreakActivity(
              userId,
              payload.streakType as StreakType,
            );
          }
          break;

        case 'achievement_check':
        case 'xp_calculation':
          result = { success: true, processed: true };
          break;

        default:
          this.logger.warn(
            `[TasksProcessor] Unknown tasks job action: ${String(action)}`,
          );
          break;
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `[TasksProcessor] Job ${job.id} (${String(action)}) finished in ${duration}ms`,
      );
      return { success: true, action, durationMs: duration, result };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `[TasksProcessor] Job ${job.id} failed after ${duration}ms: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
