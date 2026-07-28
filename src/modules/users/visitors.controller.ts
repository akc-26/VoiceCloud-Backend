import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ProfileVisitorsService } from './visitors.service';
import { RecordVisitDto } from './dto/record-visit.dto';

@ApiTags('Profile Visitors')
@Controller('users/visitors')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class VisitorsController {
  constructor(private readonly visitorsService: ProfileVisitorsService) {}

  @Post(':targetUserId')
  @ApiOperation({ summary: 'Record profile visit to target user' })
  @ApiParam({ name: 'targetUserId', description: 'ID of target user visited' })
  @ApiResponse({ status: 201, description: 'Profile visit logged successfully' })
  async recordVisit(
    @CurrentUser('userId') visitorUserId: string,
    @Param('targetUserId') targetUserId: string,
    @Body() dto: RecordVisitDto,
  ) {
    return this.visitorsService.recordVisit(targetUserId, visitorUserId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get profile visitor history for authenticated user' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiResponse({ status: 200, description: 'Visitor history list retrieved' })
  async getVisitorHistory(
    @CurrentUser('userId') userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.visitorsService.getVisitorHistory(userId, +page, +limit);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get visitor statistics for authenticated user' })
  @ApiResponse({ status: 200, description: 'Visitor statistics retrieved' })
  async getVisitorStats(@CurrentUser('userId') userId: string) {
    return this.visitorsService.getVisitorStats(userId);
  }

  @Delete(':visitorRecordId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a visitor record from history' })
  @ApiParam({ name: 'visitorRecordId', description: 'ID of visitor record' })
  @ApiResponse({ status: 200, description: 'Visitor record removed' })
  async deleteVisitorRecord(
    @CurrentUser('userId') userId: string,
    @Param('visitorRecordId') visitorRecordId: string,
  ) {
    return this.visitorsService.deleteVisitorRecord(userId, visitorRecordId);
  }
}
