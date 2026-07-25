import {
  Controller,
  Post,
  Put,
  Patch,
  Delete,
  Get,
  Param,
  Body,
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
  ApiParam,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { PresenceService } from './presence.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';

@ApiTags('User Profiles & Account Management')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly presenceService: PresenceService,
  ) {}

  @Get('profile/me')
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  async getMyProfile(@CurrentUser('userId') userId: string) {
    return this.usersService.getProfile(userId);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  async updateProfile(
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(userId, dto);
  }

  @Get(':userId/profile')
  @ApiOperation({ summary: 'Get user profile by user ID' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User profile details' })
  async getUserProfile(@Param('userId') userId: string) {
    return this.usersService.getProfile(userId);
  }

  @Get(':userId/stats')
  @ApiOperation({ summary: 'Get profile statistics and badge details' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User profile statistics' })
  async getProfileStats(@Param('userId') userId: string) {
    return this.usersService.getProfileStats(userId);
  }

  // Presence & Session aliases under /users path
  @Get('presence/online')
  @ApiOperation({ summary: 'Get online users list' })
  @ApiResponse({ status: 200, description: 'List of online users' })
  async getOnlineUsers() {
    return this.presenceService.getOnlineUsers();
  }

  @Get(':userId/presence')
  @ApiOperation({ summary: 'Get presence details for user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User presence details' })
  async getUserPresence(@Param('userId') userId: string) {
    return this.presenceService.getUserPresence(userId);
  }

  @Get(':userId/last-seen')
  @ApiOperation({ summary: 'Get user last seen timestamp' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User last seen status' })
  async getUserLastSeen(@Param('userId') userId: string) {
    return this.presenceService.getUserLastSeen(userId);
  }

  @Get('sessions/active')
  @ApiOperation({ summary: 'Get active sessions for current user' })
  @ApiResponse({ status: 200, description: 'Active user sessions' })
  async getActiveSessions(@CurrentUser('userId') userId: string) {
    return this.presenceService.getActiveSessions(userId);
  }

  @Get('devices')
  @ApiOperation({ summary: 'Get connected devices for current user' })
  @ApiResponse({ status: 200, description: 'User connected devices' })
  async getConnectedDevices(@CurrentUser('userId') userId: string) {
    return this.presenceService.getConnectedDevices(userId);
  }

  // Avatar Management
  @Post('avatar')
  @ApiOperation({ summary: 'Upload current user avatar image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Avatar image file (jpg, jpeg, png, webp, max 5MB)',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Avatar uploaded successfully.' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(
    @CurrentUser('userId') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Avatar file is required');
    }
    return this.usersService.uploadAvatar(userId, file);
  }

  @Put('avatar')
  @ApiOperation({ summary: 'Replace current user avatar image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'New avatar image file (jpg, jpeg, png, webp, max 5MB)',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Avatar replaced successfully.' })
  @UseInterceptors(FileInterceptor('file'))
  async replaceAvatar(
    @CurrentUser('userId') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Avatar file is required');
    }
    return this.usersService.replaceAvatar(userId, file);
  }

  @Delete('avatar')
  @ApiOperation({ summary: 'Delete current user avatar' })
  @ApiResponse({ status: 200, description: 'Avatar deleted successfully.' })
  async deleteAvatar(@CurrentUser('userId') userId: string) {
    return this.usersService.deleteAvatar(userId);
  }

  @Get('avatar/metadata')
  @ApiOperation({ summary: 'Retrieve current user avatar metadata' })
  @ApiResponse({ status: 200, description: 'Avatar metadata retrieved.' })
  async getAvatarMetadata(@CurrentUser('userId') userId: string) {
    return this.usersService.getAvatarMetadata(userId);
  }
}
