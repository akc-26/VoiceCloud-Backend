import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { AutoModerationService } from './auto-moderation.service';
import { DeviceSecurityService } from './device-security.service';
import { AnalyzeContentDto, RegisterDeviceDto, DeviceBanDto } from './dto/auto-moderation.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Phase 18 Security & Auto-Moderation Shield')
@Controller('moderation')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class Phase18SecurityController {
  constructor(
    private readonly autoModerationService: AutoModerationService,
    private readonly deviceSecurityService: DeviceSecurityService,
  ) {}

  @Post('auto-moderation/analyze')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Analyze content text against automated safety rules & toxicity filters' })
  @ApiResponse({ status: 200, description: 'Content analysis completed successfully' })
  analyzeContent(@Body() dto: AnalyzeContentDto) {
    const analysis = this.autoModerationService.analyzeContent(dto);
    return {
      success: true,
      data: analysis,
    };
  }

  @Post('device-security/register')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Register client device fingerprint and anti-fraud association' })
  @ApiResponse({ status: 200, description: 'Device registered successfully' })
  @ApiResponse({ status: 400, description: 'Device is banned' })
  async registerDevice(
    @CurrentUser('userId') userId: string,
    @Body() dto: RegisterDeviceDto,
  ) {
    return this.deviceSecurityService.registerDevice(userId, dto);
  }

  @Post('device-security/ban')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Ban a device fingerprint ID permanently (Admin required)' })
  @ApiResponse({ status: 200, description: 'Device banned successfully' })
  async banDevice(
    @CurrentUser('userId') adminId: string,
    @Body() dto: DeviceBanDto,
  ) {
    return this.deviceSecurityService.banDevice(adminId, dto);
  }

  @Get('device-security/check/:deviceId')
  @ApiOperation({ summary: 'Check if a device fingerprint ID is currently banned' })
  @ApiParam({ name: 'deviceId', description: 'Device fingerprint ID string' })
  @ApiResponse({ status: 200, description: 'Device ban status checked successfully' })
  async checkDeviceBan(@Param('deviceId') deviceId: string) {
    const isBanned = await this.deviceSecurityService.isDeviceBanned(deviceId);
    return {
      success: true,
      deviceId,
      isBanned,
    };
  }
}
