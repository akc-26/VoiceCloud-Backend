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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { ReferralService } from '../services/referral.service';
import { ReferralCampaignService } from '../services/referral-campaign.service';
import { ReferralFraudService } from '../services/referral-fraud.service';
import { ReferralAnalyticsService } from '../services/referral-analytics.service';
import {
  CreateReferralCampaignDto,
  UpdateReferralCampaignDto,
  FraudActionDto,
  GrantRewardDto,
  AddBlacklistDto,
  ReferralQueryDto,
} from '../dto';

@ApiTags('Admin Referral & Invite System')
@Controller('admin/referrals')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AdminReferralController {
  constructor(
    private readonly referralService: ReferralService,
    private readonly campaignService: ReferralCampaignService,
    private readonly fraudService: ReferralFraudService,
    private readonly analyticsService: ReferralAnalyticsService,
  ) {}

  // 1. CAMPAIGNS CRUD
  @Get('campaigns')
  @ApiOperation({ summary: 'List all referral campaigns' })
  @ApiResponse({ status: 200, description: 'Campaigns list' })
  async listCampaigns(@Query() query: ReferralQueryDto) {
    return this.campaignService.listCampaigns(query);
  }

  @Post('campaigns')
  @ApiOperation({ summary: 'Create a new referral campaign' })
  @ApiResponse({ status: 201, description: 'Campaign created' })
  async createCampaign(@Body() dto: CreateReferralCampaignDto) {
    return this.campaignService.createCampaign(dto);
  }

  @Patch('campaigns/:id')
  @ApiOperation({ summary: 'Update a referral campaign' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  @ApiResponse({ status: 200, description: 'Campaign updated' })
  async updateCampaign(
    @Param('id') id: string,
    @Body() dto: UpdateReferralCampaignDto,
  ) {
    return this.campaignService.updateCampaign(id, dto);
  }

  @Delete('campaigns/:id')
  @ApiOperation({ summary: 'Delete a referral campaign' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  @ApiResponse({ status: 200, description: 'Campaign deleted' })
  async deleteCampaign(@Param('id') id: string) {
    return this.campaignService.deleteCampaign(id);
  }

  // 2. FRAUD REVIEW & ACTIONS
  @Get('fraud-logs')
  @ApiOperation({ summary: 'Get referral fraud logs' })
  @ApiResponse({ status: 200, description: 'Fraud logs list' })
  async getFraudLogs(@Query() query: ReferralQueryDto) {
    return this.fraudService.getFraudLogs(query);
  }

  @Post('fraud/action')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Execute fraud action (Approve, Reject, Blacklist, Suspend, Restore)',
  })
  @ApiResponse({ status: 200, description: 'Fraud action executed' })
  async handleFraudAction(@Body() dto: FraudActionDto) {
    return this.fraudService.handleFraudAction(dto);
  }

  // 3. BLACKLIST MANAGEMENT
  @Get('blacklist')
  @ApiOperation({ summary: 'List referral blacklisted items' })
  @ApiResponse({ status: 200, description: 'Blacklist items list' })
  async getBlacklist(@Query() query: ReferralQueryDto) {
    return this.fraudService.getBlacklist(query);
  }

  @Post('blacklist')
  @ApiOperation({
    summary: 'Add IP, Device ID, or User ID to referral blacklist',
  })
  @ApiResponse({ status: 201, description: 'Added to blacklist' })
  async addBlacklist(@Body() dto: AddBlacklistDto) {
    return this.fraudService.addBlacklist(dto);
  }

  @Delete('blacklist/:id')
  @ApiOperation({ summary: 'Remove item from referral blacklist' })
  @ApiParam({ name: 'id', description: 'Blacklist ID' })
  @ApiResponse({ status: 200, description: 'Removed from blacklist' })
  async removeBlacklist(@Param('id') id: string) {
    return this.fraudService.removeBlacklist(id);
  }

  // 4. MANUAL OPERATIONS
  @Post('grant-reward')
  @ApiOperation({ summary: 'Manually grant referral reward to a user' })
  @ApiResponse({ status: 201, description: 'Reward granted' })
  async manualGrantReward(@Body() dto: GrantRewardDto) {
    return this.referralService.manualGrantReward(dto);
  }

  @Post('approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Manually approve a pending/suspected referral relationship',
  })
  @ApiResponse({ status: 200, description: 'Referral relationship approved' })
  async manualApproveReferral(@Body() body: { relationshipId: string }) {
    return this.referralService.manualApproveReferral(body.relationshipId);
  }

  // 5. ANALYTICS & SEARCH
  @Get('analytics')
  @ApiOperation({ summary: 'Get referral system analytics summary' })
  @ApiResponse({ status: 200, description: 'Referral analytics summary' })
  async getAnalytics() {
    return this.analyticsService.getAnalyticsSummary();
  }

  @Get('search')
  @ApiOperation({ summary: 'Search referral relationships and history' })
  @ApiResponse({ status: 200, description: 'Search results' })
  async searchReferrals(@Query() query: ReferralQueryDto) {
    return this.analyticsService.getAnalyticsSummary();
  }
}
