import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { AdminSettingsService } from './admin-settings.service';
import { AdminProvidersService } from './admin-providers.service';
import { AdminCmsService } from './admin-cms.service';
import { AdminFeatureFlagsService } from './admin-feature-flags.service';
import { AdminVersionsService } from './admin-versions.service';
import { AdminAuditLogsService } from './admin-audit-logs.service';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminUsersService } from './admin-users.service';

import { CreateSettingDto, UpdateSettingDto } from './dto/setting.dto';
import {
  HostBusinessSettingsResponseDto,
  UpdateHostBusinessSettingsDto,
} from './dto/host-business-settings.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  OperationalSettingsResponseDto,
  UpdateOperationalSettingsDto,
} from './dto/operational-settings.dto';
import {
  StreamingInfrastructureSettingsResponseDto,
  UpdateStreamingInfrastructureSettingsDto,
} from './dto/streaming-infrastructure-settings.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';
import {
  CreateProviderConfigDto,
  UpdateProviderConfigDto,
  RotateSecretDto,
} from './dto/provider-config.dto';
import { CreateCmsPageDto, UpdateCmsPageDto } from './dto/cms-page.dto';
import {
  CreateFeatureFlagDto,
  UpdateFeatureFlagDto,
} from './dto/feature-flag.dto';
import {
  CreateAppVersionDto,
  UpdateAppVersionDto,
} from './dto/app-version.dto';
import { QueryAuditLogsDto } from './dto/audit-log.dto';
import { QueryAdminUsersDto } from './dto/query-admin-users.dto';
import {
  AdminAdjustLevelDto,
  CreateBadgeDto,
} from '../users/dto/admin-user-management.dto';
import { ProfileVisitorsService } from '../users/visitors.service';
import { ChatService } from '../chat/chat.service';
import { ChatQueryDto } from '../chat/dto/chat-query.dto';
import { ResolveReportDto } from '../chat/dto/report-message.dto';

interface RequestWithUser extends Request {
  user?: {
    userId: string;
    email?: string;
  };
}

@ApiTags('Admin Panel')
@ApiBearerAuth()
@Controller('admin')
export class AdminController {
  constructor(
    private readonly settingsService: AdminSettingsService,
    private readonly providersService: AdminProvidersService,
    private readonly cmsService: AdminCmsService,
    private readonly featureFlagsService: AdminFeatureFlagsService,
    private readonly versionsService: AdminVersionsService,
    private readonly auditLogsService: AdminAuditLogsService,
    private readonly dashboardService: AdminDashboardService,
    private readonly usersService: AdminUsersService,
    private readonly visitorsService: ProfileVisitorsService,
    private readonly chatService: ChatService,
  ) {}

  // User Management
  @Get('users')
  @ApiOperation({ summary: 'Get paginated users for admin management' })
  async getUsers(@Query() query: QueryAdminUsersDto) {
    return this.usersService.findAllUsers(query);
  }

  @Get('users/visitors/logs')
  @ApiOperation({ summary: 'Get overall profile visitor logs for admin' })
  async getVisitorLogs(
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query('targetUserId') targetUserId?: string,
  ) {
    return this.visitorsService.adminGetVisitorLogs(
      +page,
      +limit,
      targetUserId,
    );
  }

  @Get('users/visitors/stats')
  @ApiOperation({ summary: 'Get platform visitor statistics for admin' })
  async getVisitorStats() {
    return this.visitorsService.adminGetVisitorStats();
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get user details by ID for admin' })
  async getUserById(@Param('id') id: string) {
    return this.usersService.findUserById(id);
  }

  @Patch('users/:id')
  @ApiOperation({ summary: 'Update user profile/status for admin' })
  async updateUser(@Param('id') id: string, @Body() body: any) {
    return this.usersService.updateUser(id, body);
  }

  @Delete('users/:id')
  @ApiOperation({ summary: 'Delete user account for admin' })
  async deleteUser(@Param('id') id: string) {
    return this.usersService.deleteUser(id);
  }

  @Post('users/:id/level')
  @ApiOperation({
    summary: 'Manually adjust user wealth or charm level and EXP',
  })
  async adjustUserLevel(
    @Param('id') id: string,
    @Body() dto: AdminAdjustLevelDto,
  ) {
    return this.usersService.adjustUserLevel(id, dto);
  }

  // Badges Management
  @Post('badges')
  @ApiOperation({ summary: 'Create global badge definition' })
  async createBadge(@Body() dto: CreateBadgeDto) {
    return this.usersService.createBadge(dto);
  }

  @Get('badges')
  @ApiOperation({ summary: 'List all global badges' })
  async getAllBadges() {
    return this.usersService.getAllBadges();
  }

  @Post('users/:id/badges')
  @ApiOperation({ summary: 'Manually assign badge to user' })
  async assignBadgeToUser(
    @Param('id') id: string,
    @Body('badge') badgeCode: string,
  ) {
    return this.usersService.assignBadgeToUser(id, badgeCode);
  }

  @Delete('users/:id/badges/:code')
  @ApiOperation({ summary: 'Revoke badge from user' })
  async revokeBadgeFromUser(
    @Param('id') id: string,
    @Param('code') badgeCode: string,
  ) {
    return this.usersService.revokeBadgeFromUser(id, badgeCode);
  }

  // User Settings Management
  @Get('users/:id/settings')
  @ApiOperation({ summary: 'Get user settings for admin' })
  async getUserSettings(@Param('id') id: string) {
    return this.usersService.getUserSettings(id);
  }

  @Patch('users/:id/settings')
  @ApiOperation({ summary: 'Override user settings for admin' })
  async updateUserSettings(@Param('id') id: string, @Body() body: any) {
    return this.usersService.updateUserSettings(id, body);
  }

  // System Dashboard
  @Get('dashboard/stats')
  @ApiOperation({ summary: 'Get system-wide dashboard metrics and stats' })
  async getDashboardStats() {
    return this.dashboardService.getDashboardStats();
  }

  // System Settings
  @Get('settings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get all system settings' })
  async getAllSettings() {
    return this.settingsService.findAll();
  }

  @Get('settings/group/:group')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get system settings by group' })
  async getSettingsByGroup(@Param('group') group: string) {
    return this.settingsService.findByGroup(group);
  }

  @Get('settings/operational')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get authoritative operational settings' })
  async getOperationalSettings(): Promise<OperationalSettingsResponseDto> {
    return this.settingsService.getOperationalSettings();
  }

  @Put('settings/operational')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Atomically update validated operational settings',
  })
  async updateOperationalSettings(
    @Body() dto: UpdateOperationalSettingsDto,
    @Req() req: RequestWithUser,
  ): Promise<OperationalSettingsResponseDto> {
    return this.settingsService.updateOperationalSettings(
      dto,
      req.user?.userId,
    );
  }

  @Get('settings/streaming-infrastructure')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Get private streaming infrastructure settings',
  })
  async getStreamingInfrastructureSettings(): Promise<StreamingInfrastructureSettingsResponseDto> {
    return this.settingsService.getStreamingInfrastructureSettings();
  }

  @Put('settings/streaming-infrastructure')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Atomically update private streaming infrastructure settings',
  })
  async updateStreamingInfrastructureSettings(
    @Body() dto: UpdateStreamingInfrastructureSettingsDto,
    @Req() req: RequestWithUser,
  ): Promise<StreamingInfrastructureSettingsResponseDto> {
    return this.settingsService.updateStreamingInfrastructureSettings(
      dto,
      req.user?.userId,
    );
  }

  @Get('settings/host-business')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get authoritative Host business settings' })
  async getHostBusinessSettings(): Promise<HostBusinessSettingsResponseDto> {
    return this.settingsService.getHostBusinessSettings();
  }

  @Put('settings/host-business')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Atomically update validated Host business settings',
  })
  async updateHostBusinessSettings(
    @Body() dto: UpdateHostBusinessSettingsDto,
    @Req() req: RequestWithUser,
  ): Promise<HostBusinessSettingsResponseDto> {
    return this.settingsService.updateHostBusinessSettings(
      dto,
      req.user?.userId,
    );
  }

  @Post('settings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create new system setting' })
  async createSetting(
    @Body() dto: CreateSettingDto,
    @Req() req: RequestWithUser,
  ) {
    return this.settingsService.create(dto, req.user?.userId);
  }

  @Patch('settings/:key')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update system setting value by key' })
  async updateSetting(
    @Param('key') key: string,
    @Body() dto: UpdateSettingDto,
    @Req() req: RequestWithUser,
  ) {
    return this.settingsService.update(key, dto, req.user?.userId);
  }

  // Third-Party Providers
  @Get('providers')
  @ApiOperation({ summary: 'Get all provider configurations' })
  async getAllProviders() {
    return this.providersService.findAll();
  }

  @Get('providers/health-summary')
  @ApiOperation({ summary: 'Get infrastructure provider health summary' })
  async getProviderHealthSummary() {
    return this.providersService.getHealthSummary();
  }

  @Get('providers/:id')
  @ApiOperation({ summary: 'Get provider configuration details by ID' })
  async getProviderById(@Param('id') id: string) {
    return this.providersService.findOne(id);
  }

  @Post('providers')
  @ApiOperation({ summary: 'Create new provider configuration' })
  async createProvider(
    @Body() dto: CreateProviderConfigDto,
    @Req() req: RequestWithUser,
  ) {
    return this.providersService.create(dto, req.user?.userId);
  }

  @Patch('providers/:id')
  @ApiOperation({ summary: 'Update provider configuration' })
  async updateProvider(
    @Param('id') id: string,
    @Body() dto: UpdateProviderConfigDto,
    @Req() req: RequestWithUser,
  ) {
    return this.providersService.update(id, dto, req.user?.userId);
  }

  @Patch('providers/:id/activate')
  @ApiOperation({ summary: 'Set active provider profile for its category' })
  async setActiveProvider(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
  ) {
    return this.providersService.setActive(id, req.user?.userId);
  }

  @Post('providers/:id/test')
  @ApiOperation({ summary: 'Run live connection test for provider' })
  async testProviderConnection(@Param('id') id: string) {
    return this.providersService.testConnection(id);
  }

  @Post('providers/:id/reveal')
  @ApiOperation({ summary: 'Reveal decrypted provider secrets (audit logged)' })
  async revealProviderSecret(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
  ) {
    return this.providersService.revealSecret(id, req.user?.userId);
  }

  @Post('providers/:id/rotate')
  @ApiOperation({ summary: 'Rotate credential secrets for provider' })
  async rotateProviderSecret(
    @Param('id') id: string,
    @Body() dto: RotateSecretDto,
    @Req() req: RequestWithUser,
  ) {
    return this.providersService.rotateSecret(id, dto, req.user?.userId);
  }

  @Get('providers/:id/history')
  @ApiOperation({ summary: 'Get configuration history for provider' })
  async getProviderHistory(@Param('id') id: string) {
    return this.providersService.getHistory(id);
  }

  @Post('providers/:id/rollback/:historyId')
  @ApiOperation({
    summary: 'Rollback provider configuration to a previous version',
  })
  async rollbackProvider(
    @Param('id') id: string,
    @Param('historyId') historyId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.providersService.rollback(id, historyId, req.user?.userId);
  }

  @Delete('providers/:id')
  @ApiOperation({ summary: 'Delete provider configuration' })
  async deleteProvider(@Param('id') id: string, @Req() req: RequestWithUser) {
    await this.providersService.remove(id, req.user?.userId);
    return { message: 'Provider configuration removed successfully', id };
  }

  // CMS Pages
  @Get('cms')
  @ApiOperation({ summary: 'Get all CMS pages' })
  async getAllCmsPages() {
    return this.cmsService.findAllAdmin();
  }

  @Get('cms/:id')
  @ApiOperation({ summary: 'Get CMS page by ID' })
  async getCmsPageById(@Param('id') id: string) {
    const page = await this.cmsService.findByIdAdmin(id);
    if (!page) {
      throw new NotFoundException(`CMS page with ID '${id}' not found`);
    }
    return page;
  }

  @Post('cms')
  @ApiOperation({ summary: 'Create new CMS page' })
  async createCmsPage(
    @Body() dto: CreateCmsPageDto,
    @Req() req: RequestWithUser,
  ) {
    return this.cmsService.create(dto, req.user?.userId);
  }

  @Patch('cms/:id')
  @ApiOperation({ summary: 'Update CMS page' })
  async updateCmsPage(
    @Param('id') id: string,
    @Body() dto: UpdateCmsPageDto,
    @Req() req: RequestWithUser,
  ) {
    return this.cmsService.update(id, dto, req.user?.userId);
  }

  @Delete('cms/:id')
  @ApiOperation({ summary: 'Delete CMS page' })
  async deleteCmsPage(@Param('id') id: string, @Req() req: RequestWithUser) {
    await this.cmsService.remove(id, req.user?.userId);
    return { message: 'CMS page deleted successfully', id };
  }

  // Feature Flags
  @Get('feature-flags')
  @ApiOperation({ summary: 'Get all feature flags' })
  async getAllFeatureFlags() {
    return this.featureFlagsService.findAll();
  }

  @Post('feature-flags')
  @ApiOperation({ summary: 'Create feature flag' })
  async createFeatureFlag(
    @Body() dto: CreateFeatureFlagDto,
    @Req() req: RequestWithUser,
  ) {
    return this.featureFlagsService.create(dto, req.user?.userId);
  }

  @Patch('feature-flags/:key')
  @ApiOperation({ summary: 'Update feature flag' })
  async updateFeatureFlag(
    @Param('key') key: string,
    @Body() dto: UpdateFeatureFlagDto,
    @Req() req: RequestWithUser,
  ) {
    return this.featureFlagsService.update(key, dto, req.user?.userId);
  }

  @Patch('feature-flags/:key/toggle')
  @ApiOperation({ summary: 'Toggle feature flag enabled status' })
  async toggleFeatureFlag(
    @Param('key') key: string,
    @Body('isEnabled') isEnabled: boolean,
    @Req() req: RequestWithUser,
  ) {
    return this.featureFlagsService.toggle(key, isEnabled, req.user?.userId);
  }

  // App Versions
  @Get('versions')
  @ApiOperation({ summary: 'Get all app version records' })
  async getAllVersions() {
    return this.versionsService.findAll();
  }

  @Post('versions')
  @ApiOperation({ summary: 'Create app version record' })
  async createVersion(
    @Body() dto: CreateAppVersionDto,
    @Req() req: RequestWithUser,
  ) {
    return this.versionsService.create(dto, req.user?.userId);
  }

  @Patch('versions/:id')
  @ApiOperation({ summary: 'Update app version record' })
  async updateVersion(
    @Param('id') id: string,
    @Body() dto: UpdateAppVersionDto,
    @Req() req: RequestWithUser,
  ) {
    return this.versionsService.update(id, dto, req.user?.userId);
  }

  // Audit Logs
  @Get('audit-logs')
  @ApiOperation({ summary: 'Query platform audit logs' })
  async getAuditLogs(@Query() query: QueryAuditLogsDto) {
    return this.auditLogsService.findAll(query);
  }

  // Messaging management
  @Get('messaging/conversations')
  @ApiOperation({ summary: 'Get paginated conversations for admin monitoring' })
  async getAdminConversations(@Query() query: ChatQueryDto) {
    return this.chatService.getAdminConversations(query);
  }

  @Get('messaging/conversations/:id')
  @ApiOperation({ summary: 'Get conversation details for admin audit' })
  async getAdminConversationDetails(@Param('id') id: string) {
    return this.chatService.getConversationById(id);
  }

  @Get('messaging/reports')
  @ApiOperation({ summary: 'Get reported messages for moderation queue' })
  async getAdminReportedMessages(
    @Query() query: ChatQueryDto,
    @Query('status') status?: string,
  ) {
    return this.chatService.getAdminReportedMessages(query, status);
  }

  @Patch('messaging/reports/:id')
  @ApiOperation({ summary: 'Resolve message report' })
  async resolveAdminReport(
    @Param('id') id: string,
    @Body() dto: ResolveReportDto,
    @Req() req: RequestWithUser,
  ) {
    return this.chatService.resolveAdminReport(
      id,
      req.user?.userId || 'admin',
      dto,
    );
  }

  @Get('messaging/attachments')
  @ApiOperation({ summary: 'Get chat attachments for admin audit' })
  async getAdminAttachments(@Query() query: ChatQueryDto) {
    return this.chatService.getAdminAttachments(query);
  }

  @Get('messaging/analytics')
  @ApiOperation({ summary: 'Get chat & messaging analytics' })
  async getAdminMessagingAnalytics() {
    return this.chatService.getAdminAnalytics();
  }
}
