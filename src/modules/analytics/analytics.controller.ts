import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'Get real-time performance analytics & metrics for a room' })
  @ApiParam({ name: 'id', description: 'Room UUID' })
  @ApiResponse({ status: 200, description: 'Realtime room analytics retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Room not found' })
  async getRealtimeAnalytics(
    @Param('id') roomId: string,
    @Query() query: RoomAnalyticsQueryDto,
  ) {
    const data = await this.roomAnalyticsService.getRealtimeRoomAnalytics(roomId, query);
    return {
      success: true,
      data,
    };
  }

  @Get('rooms/:id/session-summary')
  @ApiOperation({ summary: 'Get post-session historical report summary for a room' })
  @ApiParam({ name: 'id', description: 'Room UUID' })
  @ApiResponse({ status: 200, description: 'Session summary report retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Room not found' })
  async getSessionSummary(@Param('id') roomId: string) {
    const data = await this.roomAnalyticsService.getSessionSummaryReport(roomId);
    return {
      success: true,
      data,
    };
  }
}
