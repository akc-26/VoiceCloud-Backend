import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskDefinition } from './entities/task-definition.entity';
import { UserTaskProgress } from './entities/user-task-progress.entity';
import { AchievementDefinition } from './entities/achievement-definition.entity';
import { UserAchievement } from './entities/user-achievement.entity';
import { UserXpProgress } from './entities/user-xp-progress.entity';
import { UserStreak } from './entities/user-streak.entity';
import { DailyCheckIn } from './entities/daily-check-in.entity';
import { SeasonalEvent } from './entities/seasonal-event.entity';
import { RewardAuditLog } from './entities/reward-audit-log.entity';

import { RewardEngineService } from './services/reward-engine.service';
import { XpEngineService } from './services/xp-engine.service';
import { DailyTasksService } from './services/daily-tasks.service';
import { AchievementService } from './services/achievement.service';
import { StreakService } from './services/streak.service';
import { DailyCheckInService } from './services/daily-checkin.service';
import { SeasonalEventService } from './services/seasonal-event.service';
import { TasksAchievementsService } from './tasks-achievements.service';

import { TasksAchievementsController } from './controllers/tasks-achievements.controller';
import { AdminTasksAchievementsController } from './controllers/admin-tasks-achievements.controller';
import { EventsModule } from '../../common/events/events.module';
import { RedisModule } from '../../redis/redis.module';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TaskDefinition,
      UserTaskProgress,
      AchievementDefinition,
      UserAchievement,
      UserXpProgress,
      UserStreak,
      DailyCheckIn,
      SeasonalEvent,
      RewardAuditLog,
    ]),
    EventsModule,
    RedisModule,
    WalletModule,
  ],
  controllers: [TasksAchievementsController, AdminTasksAchievementsController],
  providers: [
    RewardEngineService,
    XpEngineService,
    DailyTasksService,
    AchievementService,
    StreakService,
    DailyCheckInService,
    SeasonalEventService,
    TasksAchievementsService,
  ],
  exports: [
    RewardEngineService,
    XpEngineService,
    DailyTasksService,
    AchievementService,
    StreakService,
    DailyCheckInService,
    SeasonalEventService,
    TasksAchievementsService,
  ],
})
export class TasksAchievementsModule {}
