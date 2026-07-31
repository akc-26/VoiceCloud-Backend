import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { DailyTasksService } from '../services/daily-tasks.service';
import { AchievementService } from '../services/achievement.service';
import { StreakService } from '../services/streak.service';
import { DailyCheckInService } from '../services/daily-checkin.service';
import { XpEngineService } from '../services/xp-engine.service';
import { SeasonalEventService } from '../services/seasonal-event.service';
import { TasksAchievementsService } from '../tasks-achievements.service';
import { TaskQueryDto } from '../dto/task-query.dto';
import { TrackTaskEventDto } from '../dto/track-task-event.dto';
import { StreakType } from '../entities/user-streak.entity';

@ApiTags('Daily Tasks, Achievements & Gamification Engine')
@Controller('tasks-achievements')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TasksAchievementsController {
  constructor(
    private readonly dailyTasksService: DailyTasksService,
    private readonly achievementService: AchievementService,
    private readonly streakService: StreakService,
    private readonly dailyCheckInService: DailyCheckInService,
    private readonly xpEngineService: XpEngineService,
    private readonly seasonalEventService: SeasonalEventService,
    private readonly tasksAchievementsService: TasksAchievementsService,
  ) {}

  // 1. TASKS
  @Get('tasks')
  @ApiOperation({
    summary: 'Get daily/weekly/monthly tasks with user progress',
  })
  @ApiResponse({
    status: 200,
    description: 'Tasks list with progress retrieved',
  })
  async getUserTasks(
    @CurrentUser('userId') userId: string,
    @Query() query: TaskQueryDto,
  ) {
    return this.dailyTasksService.getUserTasks(userId, query);
  }

  @Post('tasks/:taskId/claim')
  @ApiOperation({ summary: 'Claim reward for completed task' })
  @ApiParam({ name: 'taskId', description: 'ID of the completed task' })
  @ApiResponse({ status: 200, description: 'Task reward claimed successfully' })
  async claimTaskReward(
    @CurrentUser('userId') userId: string,
    @Param('taskId') taskId: string,
  ) {
    return this.dailyTasksService.claimTaskReward(userId, taskId);
  }

  @Post('tasks/event')
  @ApiOperation({ summary: 'Trigger/track task event progress manually' })
  @ApiResponse({ status: 200, description: 'Task event processed' })
  async trackTaskEvent(
    @CurrentUser('userId') userId: string,
    @Body() dto: TrackTaskEventDto,
  ) {
    return this.dailyTasksService.trackTaskEvent(
      userId,
      dto.eventKey,
      dto.count || 1,
    );
  }

  // 2. ACHIEVEMENTS
  @Get('achievements')
  @ApiOperation({
    summary: 'List all permanent achievements and unlock status',
  })
  @ApiResponse({ status: 200, description: 'Achievements list retrieved' })
  async getAchievements(@CurrentUser('userId') userId: string) {
    return this.achievementService.getAllAchievements(userId);
  }

  // 3. XP PROGRESSION
  @Get('xp/progress')
  @ApiOperation({ summary: 'Get current user level (1-50) & XP progression' })
  @ApiResponse({ status: 200, description: 'XP progress retrieved' })
  async getXpProgress(@CurrentUser('userId') userId: string) {
    return this.xpEngineService.getUserXpProgress(userId);
  }

  @Post('xp/add')
  @ApiOperation({ summary: 'Add XP to user and handle potential level ups' })
  @ApiResponse({ status: 200, description: 'XP added successfully' })
  async addXp(
    @CurrentUser('userId') userId: string,
    @Body() body: { amount: number; source?: string },
  ) {
    return this.xpEngineService.addXp(
      userId,
      body.amount || 10,
      body.source || 'user_action',
    );
  }

  // 4. STREAKS
  @Get('streaks')
  @ApiOperation({
    summary:
      'Get user activity streaks (login, hosting, listening, gifting, chat)',
  })
  @ApiResponse({ status: 200, description: 'User streaks retrieved' })
  async getStreaks(@CurrentUser('userId') userId: string) {
    return this.streakService.getUserStreaks(userId);
  }

  @Post('streaks/:type/freeze')
  @ApiOperation({ summary: 'Freeze activity streak' })
  @ApiParam({ name: 'type', enum: StreakType })
  @ApiResponse({ status: 200, description: 'Streak frozen' })
  async freezeStreak(
    @CurrentUser('userId') userId: string,
    @Param('type') type: StreakType,
  ) {
    return this.streakService.freezeStreak(userId, type);
  }

  @Post('streaks/:type/recover')
  @ApiOperation({ summary: 'Recover a lost activity streak' })
  @ApiParam({ name: 'type', enum: StreakType })
  @ApiResponse({ status: 200, description: 'Streak recovered' })
  async recoverStreak(
    @CurrentUser('userId') userId: string,
    @Param('type') type: StreakType,
  ) {
    return this.streakService.recoverStreak(userId, type);
  }

  // 5. DAILY CHECK-IN
  @Get('check-in')
  @ApiOperation({ summary: 'Get 7-day check-in status & rewards schedule' })
  @ApiResponse({ status: 200, description: 'Check-in status retrieved' })
  async getCheckInStatus(@CurrentUser('userId') userId: string) {
    return this.dailyCheckInService.getCheckInStatus(userId);
  }

  @Post('check-in/claim')
  @ApiOperation({ summary: "Claim today's check-in reward" })
  @ApiResponse({ status: 200, description: 'Check-in reward claimed' })
  async claimCheckIn(@CurrentUser('userId') userId: string) {
    return this.dailyCheckInService.claimDailyCheckIn(userId);
  }

  // 6. SEASONAL EVENTS
  @Get('seasons/active')
  @ApiOperation({ summary: 'Get active seasonal event details & multipliers' })
  @ApiResponse({ status: 200, description: 'Active seasonal event retrieved' })
  async getActiveSeason() {
    return this.seasonalEventService.getActiveSeason();
  }

  @Get('seasons/leaderboard')
  @ApiOperation({ summary: 'Get seasonal event leaderboard' })
  @ApiResponse({ status: 200, description: 'Seasonal leaderboard retrieved' })
  async getSeasonalLeaderboard(@Query('seasonId') seasonId?: string) {
    return this.seasonalEventService.getSeasonalLeaderboard(seasonId);
  }

  // 7. USER REWARD HISTORY
  @Get('rewards/history')
  @ApiOperation({ summary: 'Get personal reward audit logs history' })
  @ApiResponse({ status: 200, description: 'User audit logs history' })
  async getRewardHistory(@CurrentUser('userId') userId: string) {
    return this.tasksAchievementsService.getAuditLogs({ userId, limit: 50 });
  }
}
