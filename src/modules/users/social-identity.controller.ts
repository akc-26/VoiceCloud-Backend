import {
  Controller,
  Get,
  Post,
  Param,
  Body,
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
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SocialIdentityService } from './social-identity.service';

@ApiTags('Social Identity & QR')
@Controller('users')
export class SocialIdentityController {
  constructor(private readonly socialIdentityService: SocialIdentityService) {}

  @Get('qr')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current user personal QR code payload and image',
  })
  @ApiResponse({ status: 200, description: 'Personal QR code data retrieved' })
  async getPersonalQrCode(@CurrentUser('userId') userId: string) {
    return this.socialIdentityService.getPersonalQrCode(userId);
  }

  @Get('share')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get share profile card metadata and link' })
  @ApiResponse({ status: 200, description: 'Share profile info retrieved' })
  async getShareProfile(@CurrentUser('userId') userId: string) {
    return this.socialIdentityService.getShareProfile(userId);
  }

  @Get('referrals')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user referral statistics and code' })
  @ApiResponse({ status: 200, description: 'Referral statistics retrieved' })
  async getReferralStats(@CurrentUser('userId') userId: string) {
    return this.socialIdentityService.getReferralStats(userId);
  }

  @Post('referrals/claim')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Claim or apply a referral code' })
  @ApiResponse({
    status: 200,
    description: 'Referral code claimed successfully',
  })
  async claimReferral(
    @CurrentUser('userId') userId: string,
    @Body('referralCode') referralCode: string,
  ) {
    return this.socialIdentityService.claimReferral(userId, referralCode);
  }

  @Get('public/:username')
  @ApiOperation({
    summary: 'Get public profile information by username (No Auth required)',
  })
  @ApiParam({ name: 'username', description: 'Target user username' })
  @ApiResponse({ status: 200, description: 'Public profile retrieved' })
  async getPublicProfileByUsername(@Param('username') username: string) {
    return this.socialIdentityService.getPublicProfileByUsername(username);
  }
}
