import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { PresenceService } from './presence.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRegisterDeviceDto } from './dto/register-device.dto';
import { CreateSessionDto } from './dto/create-session.dto';
import type { Request } from 'express';

@ApiTags('User Presence & Sessions')
@Controller('presence')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PresenceController {
  constructor(private readonly presenceService: PresenceService) {}

  @Get('online')
  @ApiOperation({ summary: 'Get current online users' })
  @ApiResponse({ status: 200, description: 'List of currently online users' })
  async getOnlineUsers() {
    return this.presenceService.getOnlineUsers();
  }

  @Get('sessions')
  @ApiOperation({ summary: 'Get active sessions for current user' })
  @ApiResponse({ status: 200, description: 'User active sessions' })
  async getActiveSessions(@CurrentUser('userId') userId: string) {
    return this.presenceService.getActiveSessions(userId);
  }

  @Post('sessions')
  @ApiOperation({ summary: 'Create or refresh an active user session' })
  @ApiResponse({ status: 201, description: 'Session created successfully' })
  async createSession(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateSessionDto,
    @Req() req: Request,
  ) {
    const ip = dto.ipAddress || req.ip;
    const userAgent =
      dto.userAgent || (req.headers ? req.headers['user-agent'] : undefined);
    return this.presenceService.createSession(userId, {
      ...dto,
      ipAddress: ip,
      userAgent,
    });
  }

  @Delete('sessions/:sessionId')
  @ApiOperation({ summary: 'Terminate a user session' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({ status: 200, description: 'Session terminated' })
  async terminateSession(
    @CurrentUser('userId') userId: string,
    @Param('sessionId') sessionId: string,
  ) {
    return this.presenceService.terminateSession(userId, sessionId);
  }

  @Get('devices')
  @ApiOperation({
    summary: 'Get registered/connected devices for current user',
  })
  @ApiResponse({ status: 200, description: 'List of user devices' })
  async getConnectedDevices(@CurrentUser('userId') userId: string) {
    return this.presenceService.getConnectedDevices(userId);
  }

  @Post('devices/register')
  @ApiOperation({ summary: 'Register a new device' })
  @ApiResponse({ status: 201, description: 'Device registered successfully' })
  async registerDevice(
    @CurrentUser('userId') userId: string,
    @Body() dto: UserRegisterDeviceDto,
  ) {
    return this.presenceService.registerDevice(userId, dto);
  }

  @Get(':userId')
  @ApiOperation({ summary: 'Get user presence lookup by user ID' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User presence details' })
  async getUserPresence(@Param('userId') userId: string) {
    return this.presenceService.getUserPresence(userId);
  }

  @Get(':userId/last-seen')
  @ApiOperation({ summary: 'Get last seen timestamp for user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User last seen status' })
  async getUserLastSeen(@Param('userId') userId: string) {
    return this.presenceService.getUserLastSeen(userId);
  }
}
