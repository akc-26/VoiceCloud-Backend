import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
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
} from '@nestjs/swagger';
import { PollsService } from './polls.service';
import { CreatePollDto } from './dto/create-poll.dto';
import { VotePollDto } from './dto/vote-poll.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Interactive Room Polls')
@Controller('polls')
export class PollsController {
  constructor(private readonly pollsService: PollsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new room poll' })
  @ApiResponse({ status: 201, description: 'Poll created successfully' })
  async createPoll(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreatePollDto,
  ) {
    return this.pollsService.createPoll(userId, dto);
  }

  @Post(':pollId/start')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Start an existing poll' })
  @ApiParam({ name: 'pollId', description: 'Poll ID' })
  @ApiResponse({ status: 200, description: 'Poll started' })
  async startPoll(
    @CurrentUser('userId') userId: string,
    @Param('pollId') pollId: string,
  ) {
    return this.pollsService.startPoll(userId, pollId);
  }

  @Post(':pollId/stop')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Stop / close an active poll' })
  @ApiParam({ name: 'pollId', description: 'Poll ID' })
  @ApiResponse({ status: 200, description: 'Poll closed' })
  async stopPoll(
    @CurrentUser('userId') userId: string,
    @Param('pollId') pollId: string,
  ) {
    return this.pollsService.stopPoll(userId, pollId);
  }

  @Delete(':pollId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a poll' })
  @ApiParam({ name: 'pollId', description: 'Poll ID' })
  @ApiResponse({ status: 200, description: 'Poll deleted' })
  async deletePoll(
    @CurrentUser('userId') userId: string,
    @Param('pollId') pollId: string,
  ) {
    return this.pollsService.deletePoll(userId, pollId);
  }

  @Post(':pollId/vote')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cast or change vote on an active poll' })
  @ApiParam({ name: 'pollId', description: 'Poll ID' })
  @ApiResponse({ status: 200, description: 'Vote recorded' })
  async vote(
    @CurrentUser('userId') userId: string,
    @Param('pollId') pollId: string,
    @Body() dto: VotePollDto,
  ) {
    return this.pollsService.vote(userId, pollId, dto);
  }

  @Get('rooms/:roomId')
  @ApiOperation({ summary: 'Get all polls for a room' })
  @ApiParam({ name: 'roomId', description: 'Room ID' })
  @ApiResponse({ status: 200, description: 'List of room polls' })
  async getRoomPolls(@Param('roomId') roomId: string) {
    return this.pollsService.getRoomPolls(roomId);
  }

  @Get(':pollId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get poll details with user vote status' })
  @ApiParam({ name: 'pollId', description: 'Poll ID' })
  @ApiResponse({ status: 200, description: 'Poll details' })
  async getPoll(
    @Param('pollId') pollId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.pollsService.getPoll(pollId, userId);
  }
}
