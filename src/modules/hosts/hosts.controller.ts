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
import { CurrentUser } from '../../common/decorators/current-user.decorator';

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
    description: 'Application submitted successfully.',
  })
  async apply(
    @CurrentUser('userId') userId: string,
    @Body() dto: ApplyHostDto,
  ) {
    return this.hostsService.applyForVerification(userId, dto);
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get current user host profile' })
  @ApiResponse({ status: 200, description: 'Host profile retrieved.' })
  async getMyProfile(@CurrentUser('userId') userId: string) {
    return this.hostsService.getHostProfile(userId);
  }

  @Get('profile/:userId')
  @ApiOperation({ summary: 'Get host profile by User ID' })
  @ApiResponse({ status: 200, description: 'Host profile retrieved.' })
  async getProfileByUserId(@Param('userId') targetUserId: string) {
    return this.hostsService.getHostProfile(targetUserId);
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update current host profile information' })
  @ApiResponse({ status: 200, description: 'Host profile updated.' })
  async updateProfile(
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateHostProfileDto,
  ) {
    return this.hostsService.updateHostProfile(userId, dto);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search verified host profiles' })
  @ApiResponse({ status: 200, description: 'Matching hosts retrieved.' })
  async search(@Query() dto: SearchHostsDto) {
    return this.hostsService.searchHosts(dto);
  }

  @Get('progression')
  @ApiOperation({
    summary: 'Get host progression requirements and level progress',
  })
  @ApiResponse({ status: 200, description: 'Progression stats retrieved.' })
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
  async getEarnings(@CurrentUser('userId') userId: string) {
    return this.hostsService.getEarnings(userId);
  }

  @Post('earnings/settlement/request')
  @ApiOperation({ summary: 'Request earnings settlement withdrawal' })
  @ApiResponse({ status: 201, description: 'Settlement requested.' })
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
  async getPerformance(@CurrentUser('userId') userId: string) {
    return this.hostsService.getPerformanceAnalytics(userId);
  }

  @Get('top-hosts')
  @ApiOperation({ summary: 'Get top performing hosts leaderboard' })
  @ApiResponse({ status: 200, description: 'Top hosts retrieved.' })
  async getTopHosts(@Query('limit') limit?: number) {
    return this.hostsService.getTopHosts(limit ? Number(limit) : 10);
  }

  // ==========================================
  // 5. HOST ROOM MANAGEMENT
  // ==========================================

  @Post('rooms')
  @ApiOperation({ summary: 'Create or schedule a host room' })
  @ApiResponse({ status: 201, description: 'Host room created.' })
  async createRoom(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateHostRoomDto,
  ) {
    return this.hostsService.createHostRoom(userId, dto);
  }

  @Get('rooms/history')
  @ApiOperation({ summary: 'Get host room history' })
  @ApiResponse({ status: 200, description: 'Room history retrieved.' })
  async getRoomHistory(@CurrentUser('userId') userId: string) {
    return this.hostsService.getHostRoomHistory(userId);
  }

  @Get('rooms/analytics/:roomId')
  @ApiOperation({ summary: 'Get host room analytics' })
  @ApiResponse({ status: 200, description: 'Room analytics retrieved.' })
  async getRoomAnalytics(@Param('roomId') roomId: string) {
    return this.hostsService.getHostRoomAnalytics(roomId);
  }

  @Post('rooms/cancel/:roomId')
  @ApiOperation({ summary: 'Cancel scheduled host room' })
  @ApiResponse({ status: 200, description: 'Room cancelled.' })
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
  async performModeration(
    @CurrentUser('userId') userId: string,
    @Body() dto: HostModerationActionDto,
  ) {
    return this.hostsService.performModerationAction(userId, dto);
  }

  @Get('moderation/incidents/:roomId')
  @ApiOperation({ summary: 'Get room incident logs' })
  @ApiResponse({ status: 200, description: 'Incident logs retrieved.' })
  async getIncidents(@Param('roomId') roomId: string) {
    return this.hostsService.getIncidentLogs(roomId);
  }

  // ==========================================
  // 7. HOST REWARDS
  // ==========================================

  @Get('rewards')
  @ApiOperation({ summary: 'Get available host rewards' })
  @ApiResponse({ status: 200, description: 'Available rewards retrieved.' })
  async getRewards(@CurrentUser('userId') userId: string) {
    return this.hostsService.getAvailableRewards(userId);
  }

  @Post('rewards/claim')
  @ApiOperation({ summary: 'Claim available host reward' })
  @ApiResponse({ status: 200, description: 'Reward claimed.' })
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
  @ApiOperation({ summary: 'Admin: Get host verification applications' })
  @ApiQuery({ name: 'status', enum: HostVerificationStatus, required: false })
  @ApiResponse({ status: 200, description: 'Applications retrieved.' })
  async getApplications(@Query('status') status?: HostVerificationStatus) {
    return this.hostsService.getApplications(status);
  }

  @Get('admin/earnings')
  @ApiOperation({ summary: 'Admin: Get global host earnings overview' })
  @ApiResponse({ status: 200, description: 'Earnings overview retrieved.' })
  async getAdminEarnings() {
    return this.hostsService.getEarningsOverviewAdmin();
  }

  @Get('admin/audit-history/:hostId')
  @ApiOperation({ summary: 'Admin: Get audit history for a host profile' })
  @ApiResponse({ status: 200, description: 'Audit history retrieved.' })
  async getAuditHistory(@Param('hostId') hostId: string) {
    return this.hostsService.getAuditHistory(hostId);
  }

  @Post('admin/approve/:id')
  @ApiOperation({ summary: 'Admin: Approve host application' })
  @ApiResponse({ status: 200, description: 'Host application approved.' })
  async approveHost(
    @Param('id') id: string,
    @CurrentUser('userId') adminId: string,
  ) {
    return this.hostsService.approveHost(id, adminId || 'ADMIN');
  }

  @Post('admin/reject/:id')
  @ApiOperation({ summary: 'Admin: Reject host application' })
  @ApiResponse({ status: 200, description: 'Host application rejected.' })
  async rejectHost(
    @Param('id') id: string,
    @Body() dto: RejectHostDto,
    @CurrentUser('userId') adminId: string,
  ) {
    return this.hostsService.rejectHost(id, dto?.reason, adminId || 'ADMIN');
  }

  @Post('admin/suspend/:id')
  @ApiOperation({ summary: 'Admin: Suspend host status' })
  @ApiResponse({ status: 200, description: 'Host status suspended.' })
  async suspendHost(
    @Param('id') id: string,
    @CurrentUser('userId') adminId: string,
  ) {
    return this.hostsService.suspendHost(id, adminId || 'ADMIN');
  }

  @Post('admin/reactivate/:id')
  @ApiOperation({ summary: 'Admin: Reactivate host status' })
  @ApiResponse({ status: 200, description: 'Host status reactivated.' })
  async reactivateHost(
    @Param('id') id: string,
    @CurrentUser('userId') adminId: string,
  ) {
    return this.hostsService.reactivateHost(id, adminId || 'ADMIN');
  }

  @Post('admin/audit-note/:id')
  @ApiOperation({ summary: 'Admin: Add audit note to host profile' })
  @ApiResponse({ status: 201, description: 'Audit note added.' })
  async addAuditNote(
    @Param('id') id: string,
    @Body() dto: AddHostAuditNoteDto,
    @CurrentUser('userId') adminId: string,
  ) {
    return this.hostsService.logAuditNote(
      id,
      adminId || 'ADMIN',
      dto.note,
      'NOTE_ADDED',
    );
  }

  @Post('admin/grant-reward/:id')
  @ApiOperation({ summary: 'Admin: Grant bonus reward to host' })
  @ApiResponse({ status: 201, description: 'Reward granted.' })
  async grantReward(
    @Param('id') id: string,
    @Body() dto: { rewardName: string; amount: number },
  ) {
    return this.hostsService.grantReward(
      id,
      dto.rewardName,
      dto.amount,
      'PERFORMANCE_BONUS',
      'DIAMONDS',
    );
  }

  @Post('admin/settlement/complete/:id')
  @ApiOperation({ summary: 'Admin: Complete host settlement payout' })
  @ApiResponse({ status: 200, description: 'Settlement completed.' })
  async completeSettlement(
    @Param('id') id: string,
    @Body() dto: SettlementActionDto,
    @CurrentUser('userId') adminId: string,
  ) {
    return this.hostsService.completeSettlement(
      id,
      dto.amount,
      adminId || 'ADMIN',
    );
  }
}
