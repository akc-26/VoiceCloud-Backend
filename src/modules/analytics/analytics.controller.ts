import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { RoomAnalyticsService } from './room-analytics.service';
import { RoomAnalyticsQueryDto } from './dto/room-analytics-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Phase 18 Live Room Analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly roomAnalyticsService: RoomAnalyticsService) {}

  @Get('rooms/:id/realtime')
  @ApiOperation({
    summary: 'Get real-time performance analytics & metrics for a room',
  })
  @ApiParam({ name: 'id', description: 'Room UUID' })
  @ApiResponse({
    status: 200,
    description: 'Realtime room analytics retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Room not found' })
  async getRealtimeAnalytics(
    @Param('id') roomId: string,
    @Query() query: RoomAnalyticsQueryDto,
  ) {
    const data = await this.roomAnalyticsService.getRealtimeRoomAnalytics(
      roomId,
      query,
    );
    return {
      success: true,
      data,
    };
  }

  @Get('rooms/:id/session-summary')
  @ApiOperation({
    summary: 'Get post-session historical report summary for a room',
  })
  @ApiParam({ name: 'id', description: 'Room UUID' })
  @ApiResponse({
    status: 200,
    description: 'Session summary report retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Room not found' })
  async getSessionSummary(@Param('id') roomId: string) {
    const data =
      await this.roomAnalyticsService.getSessionSummaryReport(roomId);
    return {
      success: true,
      data,
    };
  }

  @Get('rooms/:id/audience-growth')
  @ApiOperation({
    summary: 'Get audience growth time series for a room session',
  })
  @ApiParam({ name: 'id', description: 'Room UUID' })
  @ApiResponse({ status: 200, description: 'Audience growth timeline' })
  async getAudienceGrowth(@Param('id') roomId: string) {
    const data = await this.roomAnalyticsService.getAudienceGrowth(roomId);
    return { success: true, data };
  }

  @Get('rooms/:id/listener-retention')
  @ApiOperation({ summary: 'Get detailed listener retention curve for a room' })
  @ApiParam({ name: 'id', description: 'Room UUID' })
  @ApiResponse({ status: 200, description: 'Listener retention data' })
  async getListenerRetention(@Param('id') roomId: string) {
    const data = await this.roomAnalyticsService.getListenerRetention(roomId);
    return { success: true, data };
  }

  @Get('rooms/:id/speaker-activity')
  @ApiOperation({
    summary: 'Get speaker talk time, hand raises and stage activity breakdown',
  })
  @ApiParam({ name: 'id', description: 'Room UUID' })
  @ApiResponse({ status: 200, description: 'Speaker activity metrics' })
  async getSpeakerActivity(@Param('id') roomId: string) {
    const data = await this.roomAnalyticsService.getSpeakerActivity(roomId);
    return { success: true, data };
  }

  @Get('rooms/:id/gifting-heatmap')
  @ApiOperation({ summary: 'Get hourly gifting heatmap for a room' })
  @ApiParam({ name: 'id', description: 'Room UUID' })
  @ApiResponse({ status: 200, description: 'Gifting heatmap' })
  async getGiftingHeatmap(@Param('id') roomId: string) {
    const data = await this.roomAnalyticsService.getGiftingHeatmap(roomId);
    return { success: true, data };
  }

  @Get('rooms/:id/hourly-engagement')
  @ApiOperation({
    summary: 'Get hourly chat, poll, quiz, and reaction engagement metrics',
  })
  @ApiParam({ name: 'id', description: 'Room UUID' })
  @ApiResponse({ status: 200, description: 'Hourly engagement metrics' })
  async getHourlyEngagement(@Param('id') roomId: string) {
    const data = await this.roomAnalyticsService.getHourlyEngagement(roomId);
    return { success: true, data };
  }

  @Get('rooms/compare')
  @ApiOperation({ summary: 'Compare multiple room sessions side-by-side' })
  @ApiResponse({ status: 200, description: 'Session comparison matrix' })
  async compareSessions(@Query('roomIds') roomIdsStr: string) {
    const ids = roomIdsStr ? roomIdsStr.split(',').map((s) => s.trim()) : [];
    const data = await this.roomAnalyticsService.compareSessions(ids);
    return { success: true, data };
  }
}
