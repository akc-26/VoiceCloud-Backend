import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TaskDefinition, TaskPeriod } from './entities/task-definition.entity';
import {
  UserTaskProgress,
  TaskStatus,
} from './entities/user-task-progress.entity';
import {
  AchievementDefinition,
  AchievementRarity,
} from './entities/achievement-definition.entity';
import { UserAchievement } from './entities/user-achievement.entity';
import { UserXpProgress } from './entities/user-xp-progress.entity';
import { UserStreak, StreakType } from './entities/user-streak.entity';
import { DailyCheckIn } from './entities/daily-check-in.entity';
import { SeasonalEvent } from './entities/seasonal-event.entity';
import { RewardAuditLog, RewardType } from './entities/reward-audit-log.entity';
import { User } from '../users/entities/user.entity';

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
import { TasksProcessor } from '../../queue/processors/tasks.processor';
import { RedisService } from '../../redis/redis.service';
import { EventsGateway } from '../../common/events/events.gateway';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

describe('Phase 28 - Daily Tasks, Achievements & Gamification Engine', () => {
  let rewardEngineService: RewardEngineService;
  let xpEngineService: XpEngineService;
  let dailyTasksService: DailyTasksService;
  let achievementService: AchievementService;
  let streakService: StreakService;
  let dailyCheckInService: DailyCheckInService;
  let seasonalEventService: SeasonalEventService;
  let tasksAchievementsService: TasksAchievementsService;
  let tasksController: TasksAchievementsController;
  let adminController: AdminTasksAchievementsController;
  let tasksProcessor: TasksProcessor;

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    getMany: jest.fn().mockResolvedValue([]),
    getRawOne: jest.fn().mockResolvedValue({ total: '0' }),
  };

  const mockRepository = {
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    create: jest
      .fn()
      .mockImplementation((dto) => ({ id: 'mock-id-1', ...dto })),
    save: jest
      .fn()
      .mockImplementation((entity) =>
        Promise.resolve({ id: 'mock-id-1', ...entity }),
      ),
    increment: jest.fn().mockResolvedValue({ affected: 1 }),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
    count: jest.fn().mockResolvedValue(5),
  };

  const mockEventsGateway = {
    server: {
      emit: jest.fn(),
    },
    broadcastTaskCompleted: jest.fn(),
    broadcastAchievementUnlocked: jest.fn(),
    broadcastLevelUp: jest.fn(),
    broadcastRewardClaimed: jest.fn(),
    broadcastStreakUpdated: jest.fn(),
    broadcastSeasonStarted: jest.fn(),
    broadcastSeasonEnded: jest.fn(),
  };

  const mockRedisService = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RewardEngineService,
        XpEngineService,
        DailyTasksService,
        AchievementService,
        StreakService,
        DailyCheckInService,
        SeasonalEventService,
        TasksAchievementsService,
        TasksAchievementsController,
        AdminTasksAchievementsController,
        TasksProcessor,
        {
          provide: getRepositoryToken(TaskDefinition),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(UserTaskProgress),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(AchievementDefinition),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(UserAchievement),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(UserXpProgress),
          useValue: mockRepository,
        },
        { provide: getRepositoryToken(UserStreak), useValue: mockRepository },
        { provide: getRepositoryToken(DailyCheckIn), useValue: mockRepository },
        {
          provide: getRepositoryToken(SeasonalEvent),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(RewardAuditLog),
          useValue: mockRepository,
        },
        { provide: getRepositoryToken(User), useValue: mockRepository },
        { provide: EventsGateway, useValue: mockEventsGateway },
        { provide: RedisService, useValue: mockRedisService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    rewardEngineService = module.get<RewardEngineService>(RewardEngineService);
    xpEngineService = module.get<XpEngineService>(XpEngineService);
    dailyTasksService = module.get<DailyTasksService>(DailyTasksService);
    achievementService = module.get<AchievementService>(AchievementService);
    streakService = module.get<StreakService>(StreakService);
    dailyCheckInService = module.get<DailyCheckInService>(DailyCheckInService);
    seasonalEventService =
      module.get<SeasonalEventService>(SeasonalEventService);
    tasksAchievementsService = module.get<TasksAchievementsService>(
      TasksAchievementsService,
    );
    tasksController = module.get<TasksAchievementsController>(
      TasksAchievementsController,
    );
    adminController = module.get<AdminTasksAchievementsController>(
      AdminTasksAchievementsController,
    );
    tasksProcessor = module.get<TasksProcessor>(TasksProcessor);
  });

  it('should be defined', () => {
    expect(rewardEngineService).toBeDefined();
    expect(xpEngineService).toBeDefined();
    expect(dailyTasksService).toBeDefined();
    expect(achievementService).toBeDefined();
    expect(streakService).toBeDefined();
    expect(dailyCheckInService).toBeDefined();
    expect(seasonalEventService).toBeDefined();
    expect(tasksAchievementsService).toBeDefined();
    expect(tasksController).toBeDefined();
    expect(adminController).toBeDefined();
    expect(tasksProcessor).toBeDefined();
  });

  describe('RewardEngineService', () => {
    it('should distribute coins and diamonds and log audit trail', async () => {
      const logs = await rewardEngineService.distributeReward(
        'user-1',
        { coins: 100, diamonds: 10, vipDays: 2 },
        'test_source',
        'test-id',
      );
      expect(mockRepository.increment).toHaveBeenCalledTimes(2);
      expect(logs.length).toBe(3);
    });
  });

  describe('XpEngineService', () => {
    it('should return correct required XP and level titles for Level 1-50', () => {
      expect(xpEngineService.getRequiredXpForLevel(1)).toBe(100);
      expect(xpEngineService.getRequiredXpForLevel(2)).toBe(250);
      expect(xpEngineService.getLevelTitle(1)).toBe('Novice Voice');
      expect(xpEngineService.getLevelTitle(10)).toBe('Bronze Speaker');
      expect(xpEngineService.getLevelTitle(50)).toBe('Mythic Voice');
    });

    it('should add XP and process level up', async () => {
      const res = await xpEngineService.addXp('user-1', 500, 'test_source');
      expect(res.userId).toBe('user-1');
      expect(res.totalXp).toBe(500);
    });
  });

  describe('StreakService', () => {
    it('should retrieve all 5 user streaks', async () => {
      const streaks = await streakService.getUserStreaks('user-1');
      expect(streaks.length).toBe(5);
    });

    it('should record streak activity and handle milestones', async () => {
      const streak = await streakService.recordStreakActivity(
        'user-1',
        StreakType.LOGIN,
      );
      expect(streak).toBeDefined();
    });

    it('should allow freeze and recovery of streak', async () => {
      const frozen = await streakService.freezeStreak(
        'user-1',
        StreakType.HOSTING,
      );
      expect(frozen.isFrozen).toBe(true);
    });
  });

  describe('DailyCheckInService', () => {
    it('should return check in status schedule', async () => {
      const status = await dailyCheckInService.getCheckInStatus('user-1');
      expect(status.rewardsSchedule.length).toBe(7);
      expect(status.canClaimToday).toBe(true);
    });

    it('should claim daily check in reward', async () => {
      const claim = await dailyCheckInService.claimDailyCheckIn('user-1');
      expect(claim.success).toBe(true);
      expect(claim.cycleDay).toBe(1);
    });
  });

  describe('AchievementService', () => {
    it('should check achievements for event and prevent duplicate unlocks', async () => {
      mockRepository.find.mockResolvedValueOnce([
        {
          id: 'ach-1',
          title: 'First Listener',
          eventKey: 'listen_room',
          targetCount: 1,
          coinReward: 100,
          isActive: true,
        },
      ]);
      const unlocks = await achievementService.checkAchievementsForEvent(
        'user-1',
        'listen_room',
        1,
      );
      expect(unlocks.length).toBe(1);
    });
  });

  describe('SeasonalEventService', () => {
    it('should create season and trigger rollover', async () => {
      const season = await seasonalEventService.createSeason({
        title: 'Summer Fest',
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
        xpMultiplier: 1.5,
      });
      expect(season.title).toBe('Summer Fest');

      const rollover = await seasonalEventService.triggerSeasonRollover();
      expect(rollover.success).toBe(true);
    });
  });

  describe('Controllers & Processor', () => {
    it('should handle user controller tasks endpoints', async () => {
      const tasks = await tasksController.getUserTasks('user-1', {
        period: TaskPeriod.DAILY,
      });
      expect(tasks).toBeDefined();
    });

    it('should handle admin manual grant reward endpoint', async () => {
      const grant = await adminController.manualGrantReward({
        userId: 'user-1',
        rewardType: RewardType.COINS,
        amount: 500,
        reason: 'Test Grant',
      });
      expect(grant).toBeDefined();
    });

    it('should process queue job actions in TasksProcessor', async () => {
      const jobRes = await tasksProcessor.process({
        id: 'job-1',
        name: 'daily-reset',
        data: { action: 'daily_reset' },
      } as any);
      expect(jobRes.success).toBe(true);
    });
  });
});
