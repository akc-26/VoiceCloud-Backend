import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserSettingsService } from './user-settings.service';
import { UpdateUserSettingsDto } from './dto/update-user-settings.dto';

@ApiTags('User Settings & Preferences')
@Controller('users/settings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UserSettingsController {
  constructor(private readonly userSettingsService: UserSettingsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get current authenticated user settings and preferences',
  })
  @ApiResponse({ status: 200, description: 'User settings retrieved' })
  async getUserSettings(@CurrentUser('userId') userId: string) {
    return this.userSettingsService.getOrCreateUserSettings(userId);
  }

  @Patch()
  @ApiOperation({
    summary: 'Update user settings (permissions, preferences, theme)',
  })
  @ApiResponse({ status: 200, description: 'User settings updated' })
  async updateUserSettings(
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateUserSettingsDto,
  ) {
    return this.userSettingsService.updateUserSettings(userId, dto);
  }
}
