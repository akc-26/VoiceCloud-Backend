import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { HostsService } from './hosts.service';
import { ApplyHostDto } from './dto/apply-host.dto';
import { UpdateHostProfileDto } from './dto/update-host-profile.dto';
import { RejectHostDto } from './dto/reject-host.dto';
import { SearchHostsDto } from './dto/search-hosts.dto';
import { CreateHostRoomDto } from './dto/create-host-room.dto';
import { HostModerationActionDto } from './dto/host-moderation-action.dto';
import { AddHostAuditNoteDto } from './dto/add-host-audit-note.dto';
import { ClaimRewardDto } from './dto/claim-reward.dto';
import { SettlementActionDto } from './dto/settlement-action.dto';
import { HostVerificationStatus } from './entities/host-profile.entity';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  PublicHostResponseDto,
  OwnerHostResponseDto,
  AdminHostResponseDto,
  MapperUtils,
} from './dto/host-response.dto';

@ApiTags('Host Verification & Management')
@Controller('hosts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class HostsController {
  constructor(private readonly hostsService: HostsService) {}

  // ==========================================
  // 1. APPLICATION & PROFILE
  // ==========================================

  @Post('apply')
  @ApiOperation({ summary: 'Apply for Host Verification' })
  @ApiResponse({
    status: 201,
    type: OwnerHostResponseDto,
    description: 'Application submitted successfully.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 409,
    description: 'Already verified or pending application',
  })
  async apply(
    @CurrentUser('userId') userId: string,
    @Body() dto: ApplyHostDto,
  ) {
    const profile = await this.hostsService.applyForVerification(userId, dto);
    return MapperUtils.toOwnerHostDto(profile);
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get current user host profile' })
  @ApiResponse({
    status: 200,
    type: OwnerHostResponseDto,
    description: 'Owner host profile retrieved.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Host profile not found' })
  async getMyProfile(@CurrentUser('userId') userId: string) {
    const profile = await this.hostsService.getHostProfile(userId);
    return MapperUtils.toOwnerHostDto(profile);
  }

  @Get('profile/:userId')
  @ApiOperation({ summary: 'Get host profile by User ID' })
  @ApiResponse({
    status: 200,
    type: PublicHostResponseDto,
    description: 'Public host profile retrieved.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Host profile not found' })
  async getProfileByUserId(
    @Param('userId') targetUserId: string,
    @CurrentUser('userId') currentUserId: string,
  ) {
    const profile = await this.hostsService.getHostProfile(targetUserId);
    if (currentUserId && currentUserId === targetUserId) {
      return MapperUtils.toOwnerHostDto(profile);
    }
    return MapperUtils.toPublicHostDto(profile);
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update current host profile information' })
  @ApiResponse({
    status: 200,
    type: OwnerHostResponseDto,
    description: 'Host profile updated.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Host profile not found' })
  async updateProfile(
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateHostProfileDto,
  ) {
    const profile = await this.hostsService.updateHostProfile(userId, dto);
    return MapperUtils.toOwnerHostDto(profile);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search verified host profiles' })
  @ApiResponse({
    status: 200,
    type: [PublicHostResponseDto],
    description: 'Matching hosts retrieved.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async search(@Query() dto: SearchHostsDto) {
    const hosts = await this.hostsService.searchHosts(dto);
    return hosts.map((h) => MapperUtils.toPublicHostDto(h));
  }

  @Get('progression')
  @ApiOperation({
    summary: 'Get host progression requirements and level progress',
  })
  @ApiResponse({ status: 200, description: 'Progression stats retrieved.' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProgression(@CurrentUser('userId') userId: string) {
    return this.hostsService.checkPromotionRequirements(userId);
  }

  // ==========================================
  // 2. DOCUMENT MANAGEMENT
  // ==========================================

  @Post('verification/government-id')
  @ApiOperation({ summary: 'Upload government ID document for verification' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Government ID uploaded successfully.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadGovernmentId(
    @CurrentUser('userId') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('File is required');
    return this.hostsService.uploadGovernmentId(userId, file);
  }

  @Post('verification/profile-photo')
  @ApiOperation({ summary: 'Upload verification profile selfie/photo' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Profile photo uploaded successfully.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadProfilePhoto(
    @CurrentUser('userId') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('File is required');
    return this.hostsService.uploadProfilePhoto(userId, file);
  }

  @Post('verification/documents')
  @ApiOperation({ summary: 'Upload additional host verification documents' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Verification document uploaded successfully.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadVerificationDocument(
    @CurrentUser('userId') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('File is required');
    return this.hostsService.uploadVerificationDocument(userId, file);
  }

  // ==========================================
  // 3. HOST EARNINGS & SETTLEMENTS
  // ==========================================

  @Get('earnings')
  @ApiOperation({ summary: 'Get current host earnings dashboard' })
  @ApiResponse({ status: 200, description: 'Host earnings retrieved.' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getEarnings(@CurrentUser('userId') userId: string) {
    return this.hostsService.getEarnings(userId);
  }

  @Post('earnings/settlement/request')
  @ApiOperation({ summary: 'Request earnings settlement withdrawal' })
  @ApiResponse({ status: 201, description: 'Settlement requested.' })
  @ApiResponse({ status: 400, description: 'Insufficient earnings balance' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async requestSettlement(
    @CurrentUser('userId') userId: string,
    @Body() dto: SettlementActionDto,
  ) {
    return this.hostsService.requestSettlement(userId, dto.amount);
  }

  // ==========================================
  // 4. PERFORMANCE & LEADERBOARD
  // ==========================================

  @Get('performance')
  @ApiOperation({ summary: 'Get host performance analytics' })
  @ApiResponse({ status: 200, description: 'Performance metrics retrieved.' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getPerformance(@CurrentUser('userId') userId: string) {
    return this.hostsService.getPerformanceAnalytics(userId);
  }

  @Get('top-hosts')
  @ApiOperation({ summary: 'Get top performing hosts leaderboard' })
  @ApiResponse({
    status: 200,
    type: [PublicHostResponseDto],
    description: 'Top hosts retrieved.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getTopHosts(@Query('limit') limit?: number) {
    const hosts = await this.hostsService.getTopHosts(
      limit ? Number(limit) : 10,
    );
    return hosts.map((h) => MapperUtils.toPublicHostDto(h));
  }

  // ==========================================
  // 5. HOST ROOM MANAGEMENT
  // ==========================================

  @Post('rooms')
  @ApiOperation({ summary: 'Create or schedule a host room' })
  @ApiResponse({ status: 201, description: 'Host room created.' })
  @ApiResponse({ status: 400, description: 'Host not approved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createRoom(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateHostRoomDto,
  ) {
    return this.hostsService.createHostRoom(userId, dto);
  }

  @Get('rooms/history')
  @ApiOperation({ summary: 'Get host room history' })
  @ApiResponse({ status: 200, description: 'Room history retrieved.' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getRoomHistory(@CurrentUser('userId') userId: string) {
    return this.hostsService.getHostRoomHistory(userId);
  }

  @Get('rooms/analytics/:roomId')
  @ApiOperation({ summary: 'Get host room analytics' })
  @ApiResponse({ status: 200, description: 'Room analytics retrieved.' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Room not found' })
  async getRoomAnalytics(@Param('roomId') roomId: string) {
    return this.hostsService.getHostRoomAnalytics(roomId);
  }

  @Post('rooms/cancel/:roomId')
  @ApiOperation({ summary: 'Cancel scheduled host room' })
  @ApiResponse({ status: 200, description: 'Room cancelled.' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Room not found' })
  async cancelRoom(
    @CurrentUser('userId') userId: string,
    @Param('roomId') roomId: string,
  ) {
    return this.hostsService.cancelHostRoom(userId, roomId);
  }

  // ==========================================
  // 6. HOST MODERATION TOOLS
  // ==========================================

  @Post('moderation/action')
  @ApiOperation({ summary: 'Perform host room moderation action' })
  @ApiResponse({ status: 200, description: 'Moderation action executed.' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async performModeration(
    @CurrentUser('userId') userId: string,
    @Body() dto: HostModerationActionDto,
  ) {
    return this.hostsService.performModerationAction(userId, dto);
  }

  @Get('moderation/incidents/:roomId')
  @ApiOperation({ summary: 'Get room incident logs' })
  @ApiResponse({ status: 200, description: 'Incident logs retrieved.' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getIncidents(@Param('roomId') roomId: string) {
    return this.hostsService.getIncidentLogs(roomId);
  }

  // ==========================================
  // 7. HOST REWARDS
  // ==========================================

  @Get('rewards')
  @ApiOperation({ summary: 'Get available host rewards' })
  @ApiResponse({ status: 200, description: 'Available rewards retrieved.' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getRewards(@CurrentUser('userId') userId: string) {
    return this.hostsService.getAvailableRewards(userId);
  }

  @Post('rewards/claim')
  @ApiOperation({ summary: 'Claim available host reward' })
  @ApiResponse({ status: 200, description: 'Reward claimed.' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Reward not found' })
  @ApiResponse({ status: 409, description: 'Reward already claimed' })
  async claimReward(
    @CurrentUser('userId') userId: string,
    @Body() dto: ClaimRewardDto,
  ) {
    return this.hostsService.claimReward(userId, dto.rewardId);
  }

  // ==========================================
  // 8. ADMIN ENDPOINTS
  // ==========================================

  @Get('admin/applications')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Admin: Get host verification applications' })
  @ApiQuery({ name: 'status', enum: HostVerificationStatus, required: false })
  @ApiResponse({
    status: 200,
    type: [AdminHostResponseDto],
    description: 'Applications retrieved.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden: Admin access required' })
  async getApplications(@Query('status') status?: HostVerificationStatus) {
    const apps = await this.hostsService.getApplications(status);
    return apps.map((app) => MapperUtils.toAdminHostDto(app, true));
  }

  @Get('admin/earnings')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Admin: Get global host earnings overview' })
  @ApiResponse({ status: 200, description: 'Earnings overview retrieved.' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden: Admin access required' })
  async getAdminEarnings() {
    return this.hostsService.getEarningsOverviewAdmin();
  }

  @Get('admin/audit-history/:hostId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Admin: Get audit history for a host profile' })
  @ApiResponse({ status: 200, description: 'Audit history retrieved.' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden: Admin access required' })
  @ApiResponse({ status: 404, description: 'Host not found' })
  async getAuditHistory(@Param('hostId') hostId: string) {
    return this.hostsService.getAuditHistory(hostId);
  }

  @Post('admin/approve/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Admin: Approve host application' })
  @ApiResponse({
    status: 200,
    type: AdminHostResponseDto,
    description: 'Host application approved.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden: Admin access required or self-approval prohibited',
  })
  @ApiResponse({ status: 404, description: 'Host application not found' })
  async approveHost(
    @Param('id') id: string,
    @CurrentUser('userId') adminId: string,
  ) {
    const res = await this.hostsService.approveHost(id, adminId);
    return MapperUtils.toAdminHostDto(res, true);
  }

  @Post('admin/reject/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Admin: Reject host application' })
  @ApiResponse({
    status: 200,
    type: AdminHostResponseDto,
    description: 'Host application rejected.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Host application not found' })
  async rejectHost(
    @Param('id') id: string,
    @Body() dto: RejectHostDto,
    @CurrentUser('userId') adminId: string,
  ) {
    const res = await this.hostsService.rejectHost(id, dto?.reason, adminId);
    return MapperUtils.toAdminHostDto(res, true);
  }

  @Post('admin/suspend/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Admin: Suspend host status' })
  @ApiResponse({
    status: 200,
    type: AdminHostResponseDto,
    description: 'Host status suspended.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Host application not found' })
  async suspendHost(
    @Param('id') id: string,
    @CurrentUser('userId') adminId: string,
  ) {
    const res = await this.hostsService.suspendHost(id, adminId);
    return MapperUtils.toAdminHostDto(res, true);
  }

  @Post('admin/reactivate/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Admin: Reactivate host status' })
  @ApiResponse({
    status: 200,
    type: AdminHostResponseDto,
    description: 'Host status reactivated.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Host application not found' })
  async reactivateHost(
    @Param('id') id: string,
    @CurrentUser('userId') adminId: string,
  ) {
    const res = await this.hostsService.reactivateHost(id, adminId);
    return MapperUtils.toAdminHostDto(res, true);
  }

  @Post('admin/audit-note/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Admin: Add audit note to host profile' })
  @ApiResponse({ status: 201, description: 'Audit note added.' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async addAuditNote(
    @Param('id') id: string,
    @Body() dto: AddHostAuditNoteDto,
    @CurrentUser('userId') adminId: string,
  ) {
    return this.hostsService.logAuditNote(id, adminId, dto.note, 'NOTE_ADDED');
  }

  @Post('admin/grant-reward/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Admin: Grant bonus reward to host' })
  @ApiResponse({ status: 201, description: 'Reward granted.' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async grantReward(
    @Param('id') id: string,
    @Body() dto: { rewardName: string; amount: number },
    @CurrentUser('userId') adminId: string,
  ) {
    return this.hostsService.grantReward(
      id,
      dto.rewardName,
      dto.amount,
      'PERFORMANCE_BONUS',
      'DIAMONDS',
      adminId,
    );
  }

  @Post('admin/settlement/complete/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Admin: Complete host settlement payout' })
  @ApiResponse({ status: 200, description: 'Settlement completed.' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async completeSettlement(
    @Param('id') id: string,
    @Body() dto: SettlementActionDto,
    @CurrentUser('userId') adminId: string,
  ) {
    return this.hostsService.completeSettlement(id, dto.amount, adminId);
  }
}
