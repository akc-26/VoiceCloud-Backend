import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
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
  ApiConsumes,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { AgenciesService } from './agencies.service';
import { CreateAgencyDto } from './dto/create-agency.dto';
import { ApplyAgencyDto } from './dto/apply-agency.dto';
import { UpdateAgencyApplicationDto } from './dto/update-agency-application.dto';
import { UpdateAgencyProfileDto } from './dto/update-agency-profile.dto';
import { UpdateAgencyDto } from './dto/update-agency.dto';
import { InviteAgencyMemberDto } from './dto/invite-agency-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { TransferAgencyOwnershipDto } from './dto/transfer-agency-ownership.dto';
import { CreateHostContractDto } from './dto/create-host-contract.dto';
import { ProcessSettlementDto } from './dto/process-settlement.dto';
import { ClaimAgencyRewardDto } from './dto/claim-agency-reward.dto';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApplicationStatus } from './entities/agency-application.entity';
import { AgencyRole } from './entities/agency-member.entity';
import { SettlementStatus } from './entities/agency-settlement.entity';
import { AgencyRewardType } from './entities/agency-reward.entity';

@ApiTags('Agency Management')
@Controller('agencies')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AgenciesController {
  constructor(private readonly agenciesService: AgenciesService) {}

  // --- AGENCY REGISTRATION & APPLICATIONS ---
  @Post('apply')
  @ApiOperation({ summary: 'Submit formal agency registration application' })
  @ApiResponse({ status: 201, description: 'Agency application submitted.' })
  async applyForAgency(
    @CurrentUser('userId') userId: string,
    @Body() dto: ApplyAgencyDto,
  ) {
    return this.agenciesService.applyForAgency(userId, dto);
  }

  @Get('applications/list')
  @ApiOperation({ summary: 'List agency verification applications' })
  @ApiQuery({ name: 'status', enum: ApplicationStatus, required: false })
  async listApplications(@Query('status') status?: ApplicationStatus) {
    return this.agenciesService.listApplications(status);
  }

  @Patch('applications/:id/review')
  @ApiOperation({ summary: 'Approve or reject agency application' })
  async reviewApplication(
    @Param('id') id: string,
    @CurrentUser('userId') reviewerId: string,
    @Body() dto: UpdateAgencyApplicationDto,
  ) {
    return this.agenciesService.reviewApplication(id, reviewerId, dto);
  }

  @Post(':id/suspend')
  @ApiOperation({ summary: 'Suspend agency account' })
  async suspendAgency(
    @Param('id') id: string,
    @CurrentUser('userId') adminId: string,
    @Body('reason') reason?: string,
  ) {
    return this.agenciesService.suspendAgency(id, adminId, reason);
  }

  @Post(':id/reactivate')
  @ApiOperation({ summary: 'Reactivate suspended agency' })
  async reactivateAgency(
    @Param('id') id: string,
    @CurrentUser('userId') adminId: string,
  ) {
    return this.agenciesService.reactivateAgency(id, adminId);
  }

  // --- AGENCY DIRECTORY & CRUD ---
  @Post()
  @ApiOperation({ summary: 'Create a new agency' })
  @ApiResponse({ status: 201, description: 'Agency created successfully.' })
  async createAgency(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateAgencyDto,
  ) {
    return this.agenciesService.createAgency(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all active agencies' })
  @ApiQuery({ name: 'country', required: false })
  @ApiQuery({ name: 'category', required: false })
  async findAll(
    @Query('country') country?: string,
    @Query('category') category?: string,
  ) {
    return this.agenciesService.findAllAgencies(country, category);
  }

  @Get('rankings')
  @ApiOperation({ summary: 'Get agency top rankings by revenue and members' })
  async getRankings() {
    return this.agenciesService.getRankings();
  }

  @Get('leaderboard')
  @ApiOperation({ summary: 'Get agency leaderboards by category' })
  @ApiQuery({
    name: 'type',
    enum: ['revenue', 'growth', 'active_hosts', 'engagement'],
    required: false,
  })
  async getLeaderboard(
    @Query('type')
    type: 'revenue' | 'growth' | 'active_hosts' | 'engagement' = 'revenue',
  ) {
    return this.agenciesService.getLeaderboard(type);
  }

  @Get('audit-logs/all')
  @ApiOperation({ summary: 'Get platform agency audit logs' })
  async getAllAuditLogs() {
    return this.agenciesService.getAgencyAuditLogs();
  }

  @Get('settlements/list')
  @ApiOperation({ summary: 'List agency revenue settlements' })
  @ApiQuery({ name: 'status', enum: SettlementStatus, required: false })
  @ApiQuery({ name: 'agencyId', required: false })
  async listSettlements(
    @Query('status') status?: SettlementStatus,
    @Query('agencyId') agencyId?: string,
  ) {
    return this.agenciesService.listSettlements(status, agencyId);
  }

  @Patch('settlements/:id/process')
  @ApiOperation({ summary: 'Approve or complete agency settlement payout' })
  async processSettlement(
    @Param('id') id: string,
    @CurrentUser('userId') adminId: string,
    @Body() dto: ProcessSettlementDto,
  ) {
    return this.agenciesService.processSettlement(id, adminId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get agency details by ID' })
  async findOne(@Param('id') id: string) {
    return this.agenciesService.findAgencyById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update agency information' })
  async updateAgency(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateAgencyDto,
  ) {
    return this.agenciesService.updateAgency(id, userId, dto);
  }

  @Patch(':id/profile')
  @ApiOperation({ summary: 'Update full agency profile' })
  async updateAgencyProfile(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateAgencyProfileDto,
  ) {
    return this.agenciesService.updateAgencyProfile(id, userId, dto);
  }

  @Patch(':id/verify')
  @ApiOperation({ summary: 'Toggle agency verification badge' })
  async toggleVerification(
    @Param('id') id: string,
    @Body('isVerified') isVerified: boolean,
  ) {
    return this.agenciesService.toggleVerification(id, isVerified);
  }

  @Patch(':id/featured')
  @ApiOperation({ summary: 'Toggle agency featured status' })
  async toggleFeatured(
    @Param('id') id: string,
    @Body('featured') featured: boolean,
  ) {
    return this.agenciesService.toggleFeatured(id, featured);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete agency' })
  async deleteAgency(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.agenciesService.deleteAgency(id, userId);
  }

  // --- AGENCY MEMBERS ---
  @Get(':id/members')
  @ApiOperation({ summary: 'Get list of agency members' })
  async getAgencyMembers(@Param('id') agencyId: string) {
    return this.agenciesService.getAgencyMembers(agencyId);
  }

  @Post(':id/join')
  @ApiOperation({ summary: 'Join an agency' })
  async joinAgency(
    @Param('id') agencyId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.agenciesService.joinAgency(agencyId, userId);
  }

  @Post(':id/leave')
  @ApiOperation({ summary: 'Leave an agency' })
  async leaveAgency(
    @Param('id') agencyId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.agenciesService.leaveAgency(agencyId, userId);
  }

  @Post(':id/invite')
  @ApiOperation({ summary: 'Invite a member to agency' })
  async inviteMember(
    @Param('id') agencyId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: InviteAgencyMemberDto,
  ) {
    return this.agenciesService.inviteMember(agencyId, userId, dto);
  }

  @Patch(':id/members/:memberId/role')
  @ApiOperation({ summary: 'Update agency member role' })
  async updateMemberRole(
    @Param('id') agencyId: string,
    @Param('memberId') memberId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.agenciesService.updateMemberRole(
      agencyId,
      memberId,
      userId,
      dto.role,
    );
  }

  @Delete(':id/members/:memberId')
  @ApiOperation({ summary: 'Remove member from agency' })
  async removeMember(
    @Param('id') agencyId: string,
    @Param('memberId') memberId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.agenciesService.removeMember(agencyId, memberId, userId);
  }

  @Post(':id/transfer-ownership')
  @ApiOperation({ summary: 'Transfer agency ownership to another member' })
  async transferOwnership(
    @Param('id') agencyId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: TransferAgencyOwnershipDto,
  ) {
    return this.agenciesService.transferOwnership(agencyId, userId, dto);
  }

  @Post('invitations/:id/accept')
  @ApiOperation({ summary: 'Accept agency invitation' })
  async acceptInvitation(
    @Param('id') invitationId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.agenciesService.acceptInvitation(invitationId, userId);
  }

  @Post('invitations/:id/reject')
  @ApiOperation({ summary: 'Reject agency invitation' })
  async rejectInvitation(
    @Param('id') invitationId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.agenciesService.rejectInvitation(invitationId, userId);
  }

  // --- HOST RECRUITMENT & CONTRACTS ---
  @Post(':id/hosts/recruit')
  @ApiOperation({ summary: 'Recruit host and send agency contract' })
  async recruitHost(
    @Param('id') agencyId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateHostContractDto,
  ) {
    return this.agenciesService.recruitHost(agencyId, userId, dto);
  }

  @Post('contracts/:id/accept')
  @ApiOperation({ summary: 'Accept and sign agency host contract' })
  async acceptHostContract(
    @Param('id') contractId: string,
    @CurrentUser('userId') hostUserId: string,
  ) {
    return this.agenciesService.acceptHostContract(contractId, hostUserId);
  }

  @Post('contracts/:id/terminate')
  @ApiOperation({ summary: 'Terminate agency host contract' })
  async terminateHostContract(
    @Param('id') contractId: string,
    @CurrentUser('userId') userId: string,
    @Body('reason') reason?: string,
  ) {
    return this.agenciesService.terminateHostContract(
      contractId,
      userId,
      reason,
    );
  }

  @Get(':id/hosts')
  @ApiOperation({ summary: 'Get agency managed hosts' })
  async getAgencyHosts(@Param('id') agencyId: string) {
    return this.agenciesService.getAgencyHosts(agencyId);
  }

  @Get(':id/recruitment/stats')
  @ApiOperation({ summary: 'Get host recruitment and retention statistics' })
  async getRecruitmentStats(@Param('id') agencyId: string) {
    return this.agenciesService.getRecruitmentStats(agencyId);
  }

  // --- REVENUE & SETTLEMENTS ---
  @Post(':id/settlements/calculate')
  @ApiOperation({ summary: 'Calculate agency monthly settlement' })
  async calculateSettlement(
    @Param('id') agencyId: string,
    @Body('period') period: string,
  ) {
    return this.agenciesService.calculateMonthlySettlement(
      agencyId,
      period || '2026-07',
    );
  }

  @Get(':id/revenue/report')
  @ApiOperation({ summary: 'Get agency revenue report and earnings breakdown' })
  @ApiQuery({ name: 'period', required: false })
  async getRevenueReport(
    @Param('id') agencyId: string,
    @Query('period') period?: string,
  ) {
    return this.agenciesService.getRevenueReport(agencyId, period);
  }

  // --- ANALYTICS & DASHBOARD ---
  @Get(':id/analytics')
  @ApiOperation({
    summary: 'Get agency real-time analytics & performance metrics',
  })
  async getAnalytics(@Param('id') agencyId: string) {
    return this.agenciesService.getAgencyAnalytics(agencyId);
  }

  @Get(':id/dashboard')
  @ApiOperation({ summary: 'Get agency dashboard overview' })
  async getDashboard(@Param('id') agencyId: string) {
    return this.agenciesService.getDashboard(agencyId);
  }

  @Get(':id/statistics')
  @ApiOperation({ summary: 'Get agency revenue and member statistics' })
  async getStatistics(@Param('id') agencyId: string) {
    return this.agenciesService.getStatistics(agencyId);
  }

  // --- REWARDS SYSTEM ---
  @Get(':id/rewards')
  @ApiOperation({ summary: 'Get agency active rewards and milestones' })
  async getAgencyRewards(@Param('id') agencyId: string) {
    return this.agenciesService.getAgencyRewards(agencyId);
  }

  @Post(':id/rewards/claim')
  @ApiOperation({ summary: 'Claim completed agency reward' })
  async claimAgencyReward(
    @Param('id') agencyId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: ClaimAgencyRewardDto,
  ) {
    return this.agenciesService.claimAgencyReward(
      agencyId,
      dto.rewardId,
      userId,
    );
  }

  @Post(':id/rewards/grant')
  @ApiOperation({ summary: 'Grant special reward milestone to agency' })
  async grantAgencyReward(
    @Param('id') agencyId: string,
    @Body()
    dto: {
      title: string;
      rewardAmount: number;
      rewardType: AgencyRewardType;
      description?: string;
    },
  ) {
    return this.agenciesService.grantAgencyReward(agencyId, dto);
  }

  @Get(':id/audit-logs')
  @ApiOperation({ summary: 'Get agency specific audit logs' })
  async getAgencyAuditLogs(@Param('id') agencyId: string) {
    return this.agenciesService.getAgencyAuditLogs(agencyId);
  }

  // --- MEDIA UPLOADS ---
  @Post(':id/logo')
  @ApiOperation({ summary: 'Upload agency logo image' })
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
  @UseInterceptors(FileInterceptor('file'))
  async uploadAgencyLogo(
    @Param('id') agencyId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('userId') userId: string,
  ) {
    if (!file) throw new BadRequestException('File is required');
    return this.agenciesService.uploadAgencyLogo(agencyId, file, userId);
  }

  @Post(':id/banner')
  @ApiOperation({ summary: 'Upload agency banner image' })
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
  @UseInterceptors(FileInterceptor('file'))
  async uploadAgencyBanner(
    @Param('id') agencyId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('userId') userId: string,
  ) {
    if (!file) throw new BadRequestException('File is required');
    return this.agenciesService.uploadAgencyBanner(agencyId, file, userId);
  }
}
