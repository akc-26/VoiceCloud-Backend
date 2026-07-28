import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { SoundboardService } from './soundboard.service';
import { TriggerSoundEffectDto, UpdateRoomBgmDto } from './dto/soundboard.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Room Soundboard & BGM')
@Controller('rooms')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SoundboardController {
  constructor(private readonly soundboardService: SoundboardService) {}

  @Get('soundboard/presets')
  @ApiOperation({ summary: 'Get list of preset audio sound effects' })
  @ApiResponse({ status: 200, description: 'Preset sound effects list retrieved successfully' })
  getPresets() {
    return {
      success: true,
      data: this.soundboardService.getPresetSoundEffects(),
    };
  }

  @Post(':id/soundboard/trigger')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Trigger soundboard audio effect in a live room' })
  @ApiParam({ name: 'id', description: 'Room UUID' })
  @ApiResponse({ status: 200, description: 'Sound effect triggered successfully' })
  @ApiResponse({ status: 403, description: 'User is not authorized (host or co-host required)' })
  @ApiResponse({ status: 404, description: 'Room not found' })
  async triggerSoundEffect(
    @Param('id') roomId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: TriggerSoundEffectDto,
  ) {
    return this.soundboardService.triggerSoundEffect(roomId, userId, dto);
  }

  @Put(':id/bgm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update or set background music (BGM) for a room' })
  @ApiParam({ name: 'id', description: 'Room UUID' })
  @ApiResponse({ status: 200, description: 'Room BGM updated successfully' })
  @ApiResponse({ status: 403, description: 'User is not authorized' })
  @ApiResponse({ status: 404, description: 'Room not found' })
  async updateBgm(
    @Param('id') roomId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateRoomBgmDto,
  ) {
    return this.soundboardService.updateRoomBgm(roomId, userId, dto);
  }

  @Get(':id/audio-state')
  @ApiOperation({ summary: 'Get current room BGM and soundboard audio status' })
  @ApiParam({ name: 'id', description: 'Room UUID' })
  @ApiResponse({ status: 200, description: 'Room audio state retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Room not found' })
  async getAudioState(@Param('id') roomId: string) {
    return {
      success: true,
      data: await this.soundboardService.getRoomAudioState(roomId),
    };
  }
}
