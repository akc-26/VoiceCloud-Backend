import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ModerationService } from './moderation.service';
import { CreateReportDto } from './dto/create-report.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('User Reports')
@Controller('reports')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReportsController {
  constructor(private readonly moderationService: ModerationService) {}

  @Post()
  @ApiOperation({
    summary: 'Submit a report for user, room, message, agency, or host',
  })
  @ApiResponse({ status: 201, description: 'Report submitted successfully.' })
  async createReport(
    @CurrentUser('userId') reporterId: string,
    @Body() dto: CreateReportDto,
  ) {
    return this.moderationService.createReport(reporterId, dto);
  }

  @Get('my-reports')
  @ApiOperation({ summary: 'Get list of reports submitted by current user' })
  @ApiResponse({ status: 200, description: 'User reports retrieved.' })
  async getMyReports(@CurrentUser('userId') reporterId: string) {
    return this.moderationService.getUserReports(reporterId);
  }
}
