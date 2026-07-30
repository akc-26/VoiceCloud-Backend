import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { VipService } from './vip.service';
import { SubscribeVipDto } from './dto/subscribe-vip.dto';
import { RenewVipDto } from './dto/renew-vip.dto';
import { UpgradeDowngradeVipDto } from './dto/upgrade-downgrade-vip.dto';
import { CreateVipTierDto } from './dto/create-vip-tier.dto';
import { UpdateVipTierDto } from './dto/update-vip-tier.dto';
import { CreateVipBenefitDto } from './dto/create-vip-benefit.dto';
import { CreateVipRewardDto } from './dto/create-vip-reward.dto';
import { ClaimRewardDto } from './dto/claim-reward.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('VIP Membership')
@Controller('vip')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class VipController {
  constructor(private readonly vipService: VipService) {}

  // --- Tier Public Endpoints ---
  @Get('tiers')
  @ApiOperation({
    summary: 'List available active VIP tiers (VIP 1 to VIP 10)',
  })
  @ApiResponse({
    status: 200,
    description: 'VIP tiers retrieved successfully.',
  })
  async getTiers() {
    return this.vipService.findAllTiers(false);
  }

  @Get('plans')
  @ApiOperation({ summary: 'List available active VIP plans (Legacy Alias)' })
  @ApiResponse({
    status: 200,
    description: 'VIP plans retrieved successfully.',
  })
  async getPlans() {
    return this.vipService.findAllPlans(false);
  }

  @Get('tiers/:id')
  @ApiOperation({ summary: 'Get VIP tier details by ID or level' })
  @ApiResponse({ status: 200, description: 'VIP tier retrieved successfully.' })
  async getTierById(@Param('id') id: string) {
    return this.vipService.findTierById(id);
  }

  // --- Membership Endpoints ---
  @Get('membership')
  @ApiOperation({
    summary: 'Get current user VIP membership status, EXP, progress & badges',
  })
  @ApiResponse({ status: 200, description: 'Current membership retrieved.' })
  async getCurrentMembership(@CurrentUser('userId') userId: string) {
    return this.vipService.getCurrentMembershipDetails(userId);
  }

  @Get('history')
  @ApiOperation({
    summary: 'Get user VIP purchase, renewal and upgrade history',
  })
  @ApiResponse({ status: 200, description: 'VIP purchase history retrieved.' })
  async getHistory(@CurrentUser('userId') userId: string) {
    return this.vipService.getMembershipHistory(userId);
  }

  @Post('subscribe')
  @ApiOperation({
    summary: 'Subscribe to a VIP tier (Monthly, Quarterly, Yearly)',
  })
  @ApiResponse({ status: 201, description: 'VIP subscription activated.' })
  async subscribe(
    @CurrentUser('userId') userId: string,
    @Body() dto: SubscribeVipDto,
  ) {
    return this.vipService.subscribe(userId, dto);
  }

  @Post('purchase')
  @ApiOperation({ summary: 'Purchase a VIP plan (Legacy Alias)' })
  @ApiResponse({ status: 201, description: 'VIP plan purchased successfully.' })
  async purchaseVip(
    @CurrentUser('userId') userId: string,
    @Body() dto: SubscribeVipDto,
  ) {
    return this.vipService.subscribe(userId, dto);
  }

  @Post('renew')
  @ApiOperation({ summary: 'Renew existing VIP membership' })
  @ApiResponse({
    status: 200,
    description: 'VIP membership renewed successfully.',
  })
  async renewVip(
    @CurrentUser('userId') userId: string,
    @Body() dto: RenewVipDto,
  ) {
    return this.vipService.renew(userId, dto);
  }

  @Post('cancel')
  @ApiOperation({ summary: 'Cancel current VIP subscription auto-renewal' })
  @ApiResponse({
    status: 200,
    description: 'VIP subscription auto-renew cancelled.',
  })
  async cancelVip(@CurrentUser('userId') userId: string) {
    return this.vipService.cancel(userId);
  }

  @Post('upgrade')
  @ApiOperation({ summary: 'Upgrade to a higher VIP tier' })
  @ApiResponse({ status: 200, description: 'VIP tier upgraded.' })
  async upgradeVip(
    @CurrentUser('userId') userId: string,
    @Body() dto: UpgradeDowngradeVipDto,
  ) {
    return this.vipService.upgradeOrDowngrade(userId, dto, true);
  }

  @Post('downgrade')
  @ApiOperation({ summary: 'Downgrade to a lower VIP tier' })
  @ApiResponse({ status: 200, description: 'VIP tier downgraded.' })
  async downgradeVip(
    @CurrentUser('userId') userId: string,
    @Body() dto: UpgradeDowngradeVipDto,
  ) {
    return this.vipService.upgradeOrDowngrade(userId, dto, false);
  }

  // --- Benefits & Badges Endpoints ---
  @Get('benefits')
  @ApiOperation({ summary: 'List active benefits for current user VIP tier' })
  @ApiResponse({ status: 200, description: 'User benefits retrieved.' })
  async getUserBenefits(@CurrentUser('userId') userId: string) {
    return this.vipService.getBenefitsForUser(userId);
  }

  @Get('badges')
  @ApiOperation({
    summary: 'Get dynamic VIP badges (Profile, Room, Chat, Messaging, Gift)',
  })
  @ApiResponse({ status: 200, description: 'VIP badges retrieved.' })
  async getUserBadges(@CurrentUser('userId') userId: string) {
    const details = await this.vipService.getCurrentMembershipDetails(userId);
    return details.badges;
  }

  // --- Rewards Endpoints ---
  @Get('rewards')
  @ApiOperation({
    summary:
      'List daily, weekly, and monthly VIP rewards with claim eligibility',
  })
  @ApiResponse({ status: 200, description: 'VIP rewards listed.' })
  async getAvailableRewards(@CurrentUser('userId') userId: string) {
    return this.vipService.getAvailableRewards(userId);
  }

  @Post('rewards/claim')
  @ApiOperation({ summary: 'Claim a daily, weekly, or monthly VIP reward' })
  @ApiResponse({ status: 201, description: 'VIP reward claimed successfully.' })
  async claimReward(
    @CurrentUser('userId') userId: string,
    @Body() dto: ClaimRewardDto,
  ) {
    return this.vipService.claimReward(userId, dto.rewardId);
  }

  @Get('rewards/history')
  @ApiOperation({ summary: 'Get user reward claim history' })
  @ApiResponse({ status: 200, description: 'Reward claim history retrieved.' })
  async getRewardHistory(@CurrentUser('userId') userId: string) {
    return this.vipService.getRewardHistory(userId);
  }

  @Get('rewards/missed')
  @ApiOperation({
    summary: 'Get missed login rewards tracking for current month',
  })
  @ApiResponse({
    status: 200,
    description: 'Missed rewards tracking retrieved.',
  })
  async getMissedRewards(@CurrentUser('userId') userId: string) {
    return this.vipService.getMissedRewards(userId);
  }

  // --- Exclusive Gifts & Privileges ---
  @Get('gifts')
  @ApiOperation({
    summary: 'Get VIP exclusive gifts with tier discount prices',
  })
  @ApiResponse({ status: 200, description: 'VIP gifts retrieved.' })
  async getExclusiveGifts(@CurrentUser('userId') userId: string) {
    return this.vipService.getExclusiveGifts(userId);
  }

  @Get('room-privileges')
  @ApiOperation({
    summary:
      'Get VIP room privileges (reserved seats, priority queue, speaking priority)',
  })
  @ApiResponse({ status: 200, description: 'Room privileges retrieved.' })
  async getRoomPrivileges(@CurrentUser('userId') userId: string) {
    return this.vipService.getRoomPrivileges(userId);
  }

  // --- Admin Endpoints ---
  @Get('admin/dashboard')
  @ApiOperation({ summary: 'Admin: Get VIP Analytics and overview metrics' })
  @ApiResponse({ status: 200, description: 'VIP analytics retrieved.' })
  async getAdminDashboard() {
    return this.vipService.getVipAnalytics();
  }

  @Post('admin/tiers')
  @ApiOperation({ summary: 'Admin: Create a new VIP tier' })
  @ApiResponse({ status: 201, description: 'VIP tier created.' })
  async createTier(@Body() dto: CreateVipTierDto) {
    return this.vipService.createTier(dto);
  }

  @Post('admin/plans')
  @ApiOperation({ summary: 'Admin: Create a new VIP plan (Legacy Alias)' })
  @ApiResponse({ status: 201, description: 'VIP plan created.' })
  async createPlan(@Body() dto: CreateVipTierDto) {
    return this.vipService.createTier(dto);
  }

  @Get('admin/tiers')
  @ApiOperation({ summary: 'Admin: List all VIP tiers including inactive' })
  @ApiResponse({ status: 200, description: 'All VIP tiers retrieved.' })
  async getAllTiersAdmin() {
    return this.vipService.findAllTiers(true);
  }

  @Get('admin/plans')
  @ApiOperation({
    summary: 'Admin: List all VIP plans including inactive (Legacy Alias)',
  })
  @ApiResponse({ status: 200, description: 'All VIP plans retrieved.' })
  async getAllPlansAdmin() {
    return this.vipService.findAllPlans(true);
  }

  @Put('admin/tiers/:id')
  @ApiOperation({ summary: 'Admin: Update an existing VIP tier' })
  @ApiResponse({ status: 200, description: 'VIP tier updated.' })
  async updateTier(@Param('id') id: string, @Body() dto: UpdateVipTierDto) {
    return this.vipService.updateTier(id, dto);
  }

  @Put('admin/plans/:id')
  @ApiOperation({
    summary: 'Admin: Update an existing VIP plan (Legacy Alias)',
  })
  @ApiResponse({ status: 200, description: 'VIP plan updated.' })
  async updatePlan(@Param('id') id: string, @Body() dto: UpdateVipTierDto) {
    return this.vipService.updateTier(id, dto);
  }

  @Delete('admin/tiers/:id')
  @ApiOperation({ summary: 'Admin: Delete a VIP tier' })
  @ApiResponse({ status: 200, description: 'VIP tier deleted.' })
  async deleteTier(@Param('id') id: string) {
    return this.vipService.deleteTier(id);
  }

  @Delete('admin/plans/:id')
  @ApiOperation({ summary: 'Admin: Delete a VIP plan (Legacy Alias)' })
  @ApiResponse({ status: 200, description: 'VIP plan deleted.' })
  async deletePlan(@Param('id') id: string) {
    return this.vipService.deleteTier(id);
  }

  @Get('admin/memberships')
  @ApiOperation({ summary: 'Admin: List user VIP memberships' })
  @ApiResponse({ status: 200, description: 'All memberships retrieved.' })
  async getAllMembershipsAdmin() {
    return this.vipService.getAllMembershipsAdmin();
  }

  @Get('admin/benefits')
  @ApiOperation({ summary: 'Admin: List all VIP benefit configurations' })
  @ApiResponse({ status: 200, description: 'All benefits retrieved.' })
  async getAllBenefitsAdmin() {
    return this.vipService.findAllBenefits();
  }

  @Post('admin/benefits')
  @ApiOperation({ summary: 'Admin: Create a new VIP benefit' })
  @ApiResponse({ status: 201, description: 'Benefit created.' })
  async createBenefit(@Body() dto: CreateVipBenefitDto) {
    return this.vipService.createBenefit(dto);
  }

  @Put('admin/benefits/:id')
  @ApiOperation({ summary: 'Admin: Update a VIP benefit' })
  @ApiResponse({ status: 200, description: 'Benefit updated.' })
  async updateBenefit(
    @Param('id') id: string,
    @Body() dto: Partial<CreateVipBenefitDto>,
  ) {
    return this.vipService.updateBenefit(id, dto);
  }

  @Get('admin/rewards')
  @ApiOperation({ summary: 'Admin: List all VIP rewards' })
  @ApiResponse({ status: 200, description: 'All rewards retrieved.' })
  async getAllRewardsAdmin() {
    return this.vipService.findAllRewards();
  }

  @Post('admin/rewards')
  @ApiOperation({ summary: 'Admin: Create a new VIP reward' })
  @ApiResponse({ status: 201, description: 'Reward created.' })
  async createReward(@Body() dto: CreateVipRewardDto) {
    return this.vipService.createReward(dto);
  }

  @Put('admin/rewards/:id')
  @ApiOperation({ summary: 'Admin: Update a VIP reward' })
  @ApiResponse({ status: 200, description: 'Reward updated.' })
  async updateReward(
    @Param('id') id: string,
    @Body() dto: Partial<CreateVipRewardDto>,
  ) {
    return this.vipService.updateReward(id, dto);
  }

  @Get('admin/revenue')
  @ApiOperation({ summary: 'Admin: Revenue reports by tier and cycle' })
  @ApiResponse({ status: 200, description: 'Revenue analytics retrieved.' })
  async getRevenueReports() {
    const analytics = await this.vipService.getVipAnalytics();
    return {
      totalRevenue: analytics.totalRevenue,
      revenueByCycle: analytics.revenueByCycle,
      tierDistribution: analytics.tierDistribution,
    };
  }

  @Get('admin/renewals')
  @ApiOperation({
    summary: 'Admin: Renewal and upcoming expiration monitoring',
  })
  @ApiResponse({ status: 200, description: 'Upcoming renewals retrieved.' })
  async getRenewalMonitoring() {
    return this.vipService.getUpcomingRenewalsAdmin();
  }
}
