import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ModerationService } from './moderation.service';
import { QueryReportDto } from './dto/query-report.dto';
import { ApproveReportDto, DismissReportDto } from './dto/approve-report.dto';
import { SuspendUserDto } from './dto/suspend-user.dto';
import { BanUserDto } from './dto/ban-user.dto';
import { MuteUserDto } from './dto/mute-user.dto';
import { WarnUserDto, CreateNoteDto } from './dto/warn-user.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Admin Moderation')
@Controller('moderation')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  @Get('reports')
  @ApiOperation({ summary: 'Admin: View and filter reports' })
  @ApiResponse({ status: 200, description: 'Reports list retrieved.' })
  async getReports(@Query() query: QueryReportDto) {
    return this.moderationService.getReports(query);
  }

  @Get('reports/search')
  @ApiOperation({ summary: 'Admin: Search reports by term or keyword' })
  @ApiResponse({ status: 200, description: 'Reports search results.' })
  async searchReports(@Query() query: QueryReportDto) {
    return this.moderationService.getReports(query);
  }

  @Get('reports/:id')
  @ApiOperation({ summary: 'Admin: Get report details by ID' })
  @ApiParam({ name: 'id', description: 'Report ID' })
  @ApiResponse({ status: 200, description: 'Report detail retrieved.' })
  async getReportById(@Param('id') id: string) {
    return this.moderationService.getReportById(id);
  }

  @Patch('reports/:id/approve')
  @ApiOperation({ summary: 'Admin: Approve a report' })
  @ApiParam({ name: 'id', description: 'Report ID' })
  @ApiResponse({ status: 200, description: 'Report approved.' })
  async approveReport(
    @Param('id') id: string,
    @CurrentUser('userId') moderatorId: string,
    @Body() dto: ApproveReportDto,
  ) {
    return this.moderationService.approveReport(id, moderatorId, dto);
  }

  @Patch('reports/:id/dismiss')
  @ApiOperation({ summary: 'Admin: Dismiss a report' })
  @ApiParam({ name: 'id', description: 'Report ID' })
  @ApiResponse({ status: 200, description: 'Report dismissed.' })
  async dismissReport(
    @Param('id') id: string,
    @CurrentUser('userId') moderatorId: string,
    @Body() dto: DismissReportDto,
  ) {
    return this.moderationService.dismissReport(id, moderatorId, dto);
  }

  @Post('users/:userId/suspend')
  @ApiOperation({ summary: 'Admin: Suspend a user (temporary or permanent)' })
  @ApiParam({ name: 'userId', description: 'Target user ID' })
  @ApiResponse({ status: 201, description: 'User suspended.' })
  async suspendUser(
    @Param('userId') userId: string,
    @CurrentUser('userId') moderatorId: string,
    @Body() dto: SuspendUserDto,
  ) {
    return this.moderationService.suspendUser(moderatorId, userId, dto);
  }

  @Post('users/:userId/ban')
  @ApiOperation({ summary: 'Admin: Ban a user (temporary or permanent)' })
  @ApiParam({ name: 'userId', description: 'Target user ID' })
  @ApiResponse({ status: 201, description: 'User banned.' })
  async banUser(
    @Param('userId') userId: string,
    @CurrentUser('userId') moderatorId: string,
    @Body() dto: BanUserDto,
  ) {
    return this.moderationService.banUser(moderatorId, userId, dto);
  }

  @Post('users/:userId/mute')
  @ApiOperation({ summary: 'Admin: Mute a user for a duration' })
  @ApiParam({ name: 'userId', description: 'Target user ID' })
  @ApiResponse({ status: 201, description: 'User muted.' })
  async muteUser(
    @Param('userId') userId: string,
    @CurrentUser('userId') moderatorId: string,
    @Body() dto: MuteUserDto,
  ) {
    return this.moderationService.muteUser(moderatorId, userId, dto);
  }

  @Post('users/:userId/warn')
  @ApiOperation({ summary: 'Admin: Issue a warning to a user' })
  @ApiParam({ name: 'userId', description: 'Target user ID' })
  @ApiResponse({ status: 201, description: 'Warning issued.' })
  async warnUser(
    @Param('userId') userId: string,
    @CurrentUser('userId') moderatorId: string,
    @Body() dto: WarnUserDto,
  ) {
    return this.moderationService.warnUser(moderatorId, userId, dto);
  }

  @Get('users/:userId/warnings')
  @ApiOperation({ summary: 'Admin: View warning history for a user' })
  @ApiParam({ name: 'userId', description: 'Target user ID' })
  @ApiResponse({ status: 200, description: 'Warning history retrieved.' })
  async getUserWarnings(@Param('userId') userId: string) {
    return this.moderationService.getUserWarnings(userId);
  }

  @Get('users/:userId/status')
  @ApiOperation({
    summary: 'Admin/User: Get active moderation status for user',
  })
  @ApiParam({ name: 'userId', description: 'Target user ID' })
  @ApiResponse({ status: 200, description: 'User moderation status.' })
  async getUserStatus(@Param('userId') userId: string) {
    return this.moderationService.getUserStatus(userId);
  }

  @Post('notes')
  @ApiOperation({ summary: 'Admin: Add a internal moderation note' })
  @ApiResponse({ status: 201, description: 'Note added.' })
  async addNote(
    @CurrentUser('userId') authorId: string,
    @Body() dto: CreateNoteDto,
  ) {
    return this.moderationService.addNote(authorId, dto);
  }

  @Get('notes/:targetId')
  @ApiOperation({ summary: 'Admin: View moderation notes for target ID' })
  @ApiParam({ name: 'targetId', description: 'Target entity ID' })
  @ApiResponse({ status: 200, description: 'Notes retrieved.' })
  async getNotes(@Param('targetId') targetId: string) {
    return this.moderationService.getNotes(targetId);
  }

  @Get('audit-logs')
  @ApiOperation({ summary: 'Admin: View moderation audit trail / actions log' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiResponse({ status: 200, description: 'Audit logs retrieved.' })
  async getAuditTrail(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.moderationService.getAuditTrail(Number(page), Number(limit));
  }
}
