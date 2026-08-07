import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
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
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../../common/enums';
import { DailyTasksService } from '../services/daily-tasks.service';
import { AchievementService } from '../services/achievement.service';
import { SeasonalEventService } from '../services/seasonal-event.service';
import { RewardEngineService } from '../services/reward-engine.service';
import { TasksAchievementsService } from '../tasks-achievements.service';
import { CreateTaskDefinitionDto } from '../dto/create-task-definition.dto';
import { UpdateTaskDefinitionDto } from '../dto/update-task-definition.dto';
import { CreateAchievementDefinitionDto } from '../dto/create-achievement-definition.dto';
import { UpdateAchievementDefinitionDto } from '../dto/update-achievement-definition.dto';
import { CreateSeasonalEventDto } from '../dto/create-seasonal-event.dto';
import { UpdateSeasonalEventDto } from '../dto/update-seasonal-event.dto';
import { TaskQueryDto } from '../dto/task-query.dto';
import { AuditLogQueryDto } from '../dto/audit-log-query.dto';
import { ManualGrantRewardDto } from '../dto/manual-grant-reward.dto';

@ApiTags('Admin Daily Tasks & Achievements Management')
@Controller('admin/tasks-achievements')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@ApiBearerAuth()
export class AdminTasksAchievementsController {
  constructor(
    private readonly dailyTasksService: DailyTasksService,
    private readonly achievementService: AchievementService,
    private readonly seasonalEventService: SeasonalEventService,
    private readonly rewardEngineService: RewardEngineService,
    private readonly tasksAchievementsService: TasksAchievementsService,
  ) {}

  // 1. TASK DEFINITIONS CRUD
  @Get('tasks')
  @ApiOperation({ summary: 'List all task definitions' })
  @ApiResponse({ status: 200, description: 'Task definitions list' })
  async listTasks(@Query() query: TaskQueryDto) {
    return this.dailyTasksService.listTaskDefinitions(query);
  }

  @Post('tasks')
  @ApiOperation({ summary: 'Create new task definition' })
  @ApiResponse({ status: 201, description: 'Task definition created' })
  async createTask(@Body() dto: CreateTaskDefinitionDto) {
    return this.dailyTasksService.createTaskDefinition(dto);
  }

  @Patch('tasks/:id')
  @ApiOperation({ summary: 'Update task definition' })
  @ApiParam({ name: 'id', description: 'Task Definition ID' })
  @ApiResponse({ status: 200, description: 'Task definition updated' })
  async updateTask(
    @Param('id') id: string,
    @Body() dto: UpdateTaskDefinitionDto,
  ) {
    return this.dailyTasksService.updateTaskDefinition(id, dto);
  }

  @Delete('tasks/:id')
  @ApiOperation({ summary: 'Delete task definition' })
  @ApiParam({ name: 'id', description: 'Task Definition ID' })
  @ApiResponse({ status: 200, description: 'Task definition deleted' })
  async deleteTask(@Param('id') id: string) {
    return this.dailyTasksService.deleteTaskDefinition(id);
  }

  // 2. ACHIEVEMENT DEFINITIONS CRUD
  @Get('achievements')
  @ApiOperation({ summary: 'List all achievement definitions' })
  @ApiResponse({ status: 200, description: 'Achievement definitions list' })
  async listAchievements() {
    return this.achievementService.getAllAchievements();
  }

  @Post('achievements')
  @ApiOperation({ summary: 'Create new achievement definition' })
  @ApiResponse({ status: 201, description: 'Achievement definition created' })
  async createAchievement(@Body() dto: CreateAchievementDefinitionDto) {
    return this.achievementService.createAchievement(dto);
  }

  @Patch('achievements/:id')
  @ApiOperation({ summary: 'Update achievement definition' })
  @ApiParam({ name: 'id', description: 'Achievement Definition ID' })
  @ApiResponse({ status: 200, description: 'Achievement definition updated' })
  async updateAchievement(
    @Param('id') id: string,
    @Body() dto: UpdateAchievementDefinitionDto,
  ) {
    return this.achievementService.updateAchievement(id, dto);
  }

  @Delete('achievements/:id')
  @ApiOperation({ summary: 'Delete achievement definition' })
  @ApiParam({ name: 'id', description: 'Achievement Definition ID' })
  @ApiResponse({ status: 200, description: 'Achievement definition deleted' })
  async deleteAchievement(@Param('id') id: string) {
    return this.achievementService.deleteAchievement(id);
  }

  // 3. SEASONAL EVENTS CRUD & ROLLOVER
  @Get('seasons')
  @ApiOperation({ summary: 'List all seasonal events' })
  @ApiResponse({ status: 200, description: 'Seasonal events list' })
  async listSeasons() {
    return this.seasonalEventService.listSeasons();
  }

  @Post('seasons')
  @ApiOperation({ summary: 'Create new seasonal event' })
  @ApiResponse({ status: 201, description: 'Seasonal event created' })
  async createSeason(@Body() dto: CreateSeasonalEventDto) {
    return this.seasonalEventService.createSeason(dto);
  }

  @Patch('seasons/:id')
  @ApiOperation({ summary: 'Update seasonal event' })
  @ApiParam({ name: 'id', description: 'Season ID' })
  @ApiResponse({ status: 200, description: 'Seasonal event updated' })
  async updateSeason(
    @Param('id') id: string,
    @Body() dto: UpdateSeasonalEventDto,
  ) {
    return this.seasonalEventService.updateSeason(id, dto);
  }

  @Post('seasons/:id/rollover')
  @ApiOperation({ summary: 'Trigger manual seasonal event rollover' })
  @ApiResponse({ status: 200, description: 'Season rollover executed' })
  async triggerSeasonRollover() {
    return this.seasonalEventService.triggerSeasonRollover();
  }

  // 4. MANUAL OPERATIONS & GRANTS
  @Post('manual-grant-reward')
  @ApiOperation({
    summary: 'Manually award coins, diamonds, VIP, or items to a user',
  })
  @ApiResponse({ status: 201, description: 'Reward granted manually' })
  async manualGrantReward(@Body() dto: ManualGrantRewardDto) {
    const payload: Record<string, unknown> = {};
    if (dto.rewardType === 'coins') payload.coins = dto.amount;
    if (dto.rewardType === 'diamonds') payload.diamonds = dto.amount;
    if (dto.rewardType === 'xp') payload.xp = dto.amount;
    if (dto.rewardType === 'vip_trial') payload.vipDays = dto.amount;
    if (dto.rewardType === 'profile_frame')
      payload.profileFrame = dto.metadata || 'frame_custom';
    if (dto.rewardType === 'chat_bubble')
      payload.chatBubble = dto.metadata || 'bubble_custom';
    if (dto.rewardType === 'entrance_effect')
      payload.entranceEffect = dto.metadata || 'effect_custom';
    if (dto.rewardType === 'exclusive_sticker')
      payload.exclusiveSticker = dto.metadata || 'sticker_custom';
    if (dto.rewardType === 'badge')
      payload.badge = dto.metadata || 'badge_custom';

    return this.rewardEngineService.distributeReward(
      dto.userId,
      payload,
      'admin_grant',
      dto.reason || 'Admin Manual Grant',
    );
  }

  @Post('manual-reset')
  @ApiOperation({
    summary: 'Trigger manual reset for daily, weekly, or monthly tasks',
  })
  @ApiResponse({ status: 200, description: 'Task reset executed' })
  async manualReset(@Body() body: { period: 'daily' | 'weekly' | 'monthly' }) {
    return this.tasksAchievementsService.manualReset(body.period || 'daily');
  }

  // 5. USER PROGRESS VIEWER
  @Get('user-progress/:userId')
  @ApiOperation({ summary: 'View comprehensive progress for a specific user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User comprehensive progress' })
  async getUserProgress(@Param('userId') userId: string) {
    return this.tasksAchievementsService.getUserCompleteProgress(userId);
  }

  // 6. AUDIT LOGS
  @Get('rewards/audit-logs')
  @ApiOperation({ summary: 'Query platform-wide reward audit logs' })
  @ApiResponse({ status: 200, description: 'Reward audit logs list' })
  async getAuditLogs(@Query() query: AuditLogQueryDto) {
    return this.tasksAchievementsService.getAuditLogs(query);
  }

  // 7. ANALYTICS
  @Get('analytics')
  @ApiOperation({
    summary: 'Get Tasks & Achievements system analytics summary',
  })
  @ApiResponse({ status: 200, description: 'System analytics summary' })
  async getAnalytics() {
    return this.tasksAchievementsService.getAnalytics();
  }
}
