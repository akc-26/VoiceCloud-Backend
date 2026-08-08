import { Processor, WorkerHost } from '@nestjs/bullmq';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../queue.constants';
import { TasksAchievementsService } from '../../modules/tasks-achievements/tasks-achievements.service';
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
    private readonly seasonalEventService: SeasonalEventService,
    private readonly rewardEngineService: RewardEngineService,
    private readonly streakService: StreakService,
  ) {
    super();
  }

  async process(job: Job<TasksJobData, any, string>): Promise<any> {
    const startTime = Date.now();
    const { action, userId, payload } = job.data;
    let result: any;

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
      case 'reward_distribution': {
        if (!userId || !payload?.source || !payload?.sourceId) {
          throw new BadRequestException(
            'Queued reward distribution requires userId, source and sourceId',
          );
        }
        result = await this.rewardEngineService.distributeReward(
          userId,
          payload,
          payload.source,
          payload.sourceId,
          payload.operationKey ||
            `reward:queue:${payload.source}:${payload.sourceId}:${userId}`,
        );
        break;
      }
      case 'streak_update':
        if (!userId || !payload?.streakType) {
          throw new BadRequestException(
            'Queued streak update requires userId and streakType',
          );
        }
        result = await this.streakService.recordStreakActivity(
          userId,
          payload.streakType as StreakType,
        );
        break;
      case 'achievement_check':
      case 'xp_calculation':
        throw new BadRequestException(
          `Queued ${action} has no persisted recovery operation and cannot report placeholder success`,
        );
      default:
        throw new BadRequestException(
          `Unknown tasks job action: ${String(action)}`,
        );
    }

    return {
      success: true,
      action,
      durationMs: Date.now() - startTime,
      result,
    };
  }
}
