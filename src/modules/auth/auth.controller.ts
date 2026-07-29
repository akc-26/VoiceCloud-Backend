import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Headers,
  Req,
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
  ApiQuery,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { DeviceSessionService } from './device-session.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { SendOtpDto, VerifyOtpDto, PhoneLoginDto } from './dto/phone-otp.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { GuestLoginDto, GuestUpgradeDto } from './dto/guest-auth.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthResponseDto, OtpResponseDto } from './dto/auth-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly deviceSessionService: DeviceSessionService,
  ) {}

  private extractClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return req.ip || '127.0.0.1';
  }

  // --- Phone Auth ---
  @Public()
  @Post('phone/send-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send Phone OTP for login or verification' })
  @ApiResponse({ status: 200, type: OtpResponseDto })
  async sendPhoneOtp(@Body() dto: SendOtpDto): Promise<OtpResponseDto> {
    return this.authService.sendPhoneOtp(dto);
  }

  @Public()
  @Post('phone/verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify Phone OTP code' })
  async verifyPhoneOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyPhoneOtp(dto);
  }

  @Public()
  @Post('phone/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Authenticate or Register via Phone OTP / Firebase',
  })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  async phoneLogin(
    @Body() dto: PhoneLoginDto,
    @Req() req: Request,
  ): Promise<AuthResponseDto> {
    const ip = this.extractClientIp(req);
    const userAgent = req.headers['user-agent'];
    return this.authService.phoneLogin(dto, ip, userAgent);
  }

  // --- Google Auth ---
  @Public()
  @Post('google/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Authenticate or Register via Google Sign-In ID Token',
  })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  async googleLogin(
    @Body() dto: GoogleLoginDto,
    @Req() req: Request,
  ): Promise<AuthResponseDto> {
    const ip = this.extractClientIp(req);
    const userAgent = req.headers['user-agent'];
    return this.authService.googleLogin(dto, ip, userAgent);
  }

  // --- Guest Auth ---
  @Public()
  @Post('guest/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create temporary guest user account' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  async guestLogin(
    @Body() dto: GuestLoginDto,
    @Req() req: Request,
  ): Promise<AuthResponseDto> {
    const ip = this.extractClientIp(req);
    const userAgent = req.headers['user-agent'];
    return this.authService.guestLogin(dto, ip, userAgent);
  }

  @Post('guest/upgrade')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Upgrade active guest account to full user account',
  })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  async upgradeGuest(
    @CurrentUser('userId') userId: string,
    @Body() dto: GuestUpgradeDto,
    @Req() req: Request,
  ): Promise<AuthResponseDto> {
    const ip = this.extractClientIp(req);
    const userAgent = req.headers['user-agent'];
    return this.authService.upgradeGuestAccount(userId, dto, ip, userAgent);
  }

  // --- Email/Password Auth ---
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate via Email/Username and Password' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: Request,
  ): Promise<AuthResponseDto> {
    const ip = this.extractClientIp(req);
    const userAgent = req.headers['user-agent'];
    return this.authService.login(loginDto, ip, userAgent);
  }

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register new user with Email and Password' })
  @ApiResponse({ status: 201, type: AuthResponseDto })
  async register(
    @Body() registerDto: RegisterDto,
    @Req() req: Request,
  ): Promise<AuthResponseDto> {
    const ip = this.extractClientIp(req);
    const userAgent = req.headers['user-agent'];
    return this.authService.register(registerDto, ip, userAgent);
  }

  // --- Token Refresh ---
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh JWT access token using refresh token' })
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Headers('authorization') authHeader?: string,
  ) {
    return this.authService.refreshToken(dto, authHeader);
  }

  // --- User Profile & Logout ---
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  async getMe(@CurrentUser('userId') userId: string) {
    return this.authService.getMe(userId);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout current active session' })
  async logout(
    @CurrentUser('userId') userId: string,
    @CurrentUser('sessionId') sessionId?: string,
    @CurrentUser('jti') jti?: string,
  ) {
    return this.authService.logout(userId, sessionId, jti);
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Revoke and logout from all active user devices and sessions',
  })
  async logoutAll(@CurrentUser('userId') userId: string) {
    return this.authService.logoutAllDevices(userId);
  }

  // --- Sessions & Devices ---
  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List active user sessions' })
  async getSessions(@CurrentUser('userId') userId: string) {
    return this.deviceSessionService.getUserSessions(userId);
  }

  @Delete('sessions/:sessionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke specific active session' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  async revokeSession(
    @CurrentUser('userId') userId: string,
    @Param('sessionId') sessionId: string,
  ) {
    const success = await this.deviceSessionService.revokeSession(
      sessionId,
      userId,
    );
    return {
      success,
      message: success ? 'Session revoked successfully' : 'Session not found',
    };
  }

  @Get('devices')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List registered user devices' })
  async getDevices(@CurrentUser('userId') userId: string) {
    return this.deviceSessionService.getUserDevices(userId);
  }

  @Delete('devices/:deviceId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke specific user device' })
  @ApiParam({ name: 'deviceId', description: 'Device ID' })
  async revokeDevice(
    @CurrentUser('userId') userId: string,
    @Param('deviceId') deviceId: string,
  ) {
    const success = await this.deviceSessionService.revokeDevice(
      deviceId,
      userId,
    );
    return {
      success,
      message: success ? 'Device revoked successfully' : 'Device not found',
    };
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user connection & login history' })
  @ApiQuery({ name: 'limit', required: false, example: 50 })
  async getHistory(
    @CurrentUser('userId') userId: string,
    @Query('limit') limit?: number,
  ) {
    return this.deviceSessionService.getUserConnectionHistory(
      userId,
      limit ? Number(limit) : 50,
    );
  }

  // --- Referral Validation ---
  @Public()
  @Get('referral/validate/:code')
  @ApiOperation({ summary: 'Validate referral code before registration' })
  @ApiParam({ name: 'code', example: 'VC882910' })
  async validateReferralCode(@Param('code') code: string) {
    return this.authService.validateReferralCode(code);
  }
}
