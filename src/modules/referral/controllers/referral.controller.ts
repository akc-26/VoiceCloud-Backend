import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { ReferralService } from '../services/referral.service';
import { ReferralCampaignService } from '../services/referral-campaign.service';
import { GenerateReferralCodeDto, ApplyReferralCodeDto, ReferralQueryDto } from '../dto';

@ApiTags('Phase 30 Referral & Invite System')
@Controller('api/v1/referrals')
export class ReferralController {
  constructor(
    private readonly referralService: ReferralService,
    private readonly campaignService: ReferralCampaignService,
  ) {}

  @Post('generate-code')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate or customize unique user referral code' })
  @ApiResponse({ status: 200, description: 'Referral code generated or updated' })
  async generateCode(
    @Request() req: any,
    @Body() dto: GenerateReferralCodeDto,
  ) {
    const userId = req.user?.id || req.user?.userId;
    return this.referralService.getOrCreateUserReferralCode(
      userId,
      dto.customCode,
    );
  }

  @Get('summary')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user referral summary, stats, and next milestone' })
  @ApiResponse({ status: 200, description: 'User referral summary' })
  async getSummary(@Request() req: any) {
    const userId = req.user?.id || req.user?.userId;
    return this.referralService.getReferralSummary(userId);
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get history of referred users and qualification status' })
  @ApiResponse({ status: 200, description: 'List of referred users' })
  async getHistory(@Request() req: any, @Query() query: ReferralQueryDto) {
    const userId = req.user?.id || req.user?.userId;
    return this.referralService.getReferralHistory(userId, query);
  }

  @Get('rewards')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get history of earned referral rewards' })
  @ApiResponse({ status: 200, description: 'Referral rewards list' })
  async getRewards(@Request() req: any) {
    const userId = req.user?.id || req.user?.userId;
    return this.referralService.getReferralRewards(userId);
  }

  @Get('milestones')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get referral milestones and unlock progress' })
  @ApiResponse({ status: 200, description: 'Referral milestones list' })
  async getMilestones(@Request() req: any) {
    const userId = req.user?.id || req.user?.userId;
    return this.referralService.getReferralMilestones(userId);
  }

  @Post('apply-code')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Apply a referrer code during registration or onboarding' })
  @ApiResponse({ status: 200, description: 'Referral code applied successfully' })
  async applyCode(@Request() req: any, @Body() dto: ApplyReferralCodeDto) {
    const userId = req.user?.id || req.user?.userId;
    return this.referralService.applyReferralCode(userId, dto);
  }

  @Get('campaigns')
  @ApiOperation({ summary: 'Get active public referral campaigns' })
  @ApiResponse({ status: 200, description: 'Active referral campaigns' })
  async getCampaigns() {
    return this.campaignService.getActiveCampaigns();
  }

  @Get('leaderboard')
  @ApiOperation({ summary: 'Get top referrers leaderboard' })
  @ApiResponse({ status: 200, description: 'Referral leaderboard' })
  async getLeaderboard() {
    return this.referralService.getLeaderboard();
  }
}
