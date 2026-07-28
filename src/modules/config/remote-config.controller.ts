import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { RemoteConfigService } from './remote-config.service';
import { VersionCheckDto } from './dto/version-check.dto';

@ApiTags('Remote Configuration')
@Controller('config')
export class RemoteConfigController {
  constructor(private readonly remoteConfigService: RemoteConfigService) {}

  @Public()
  @Get('public/remote-config')
  @ApiOperation({ summary: 'Get public remote configuration details' })
  @ApiResponse({ status: 200, description: 'Remote config retrieved successfully.' })
  async getPublicRemoteConfig() {
    return this.remoteConfigService.getPublicRemoteConfig();
  }

  @Public()
  @Get('public/version-check')
  @ApiOperation({ summary: 'Check mobile application version update requirements' })
  @ApiQuery({ name: 'platform', required: false, example: 'android' })
  @ApiQuery({ name: 'currentVersion', required: false, example: '1.0.0' })
  @ApiResponse({ status: 200, description: 'Version check result returned successfully.' })
  async checkVersion(@Query() dto: VersionCheckDto) {
    return this.remoteConfigService.checkVersion(dto);
  }
}
