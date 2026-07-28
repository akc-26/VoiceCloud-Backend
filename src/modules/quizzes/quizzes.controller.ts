import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { QuizzesService } from './quizzes.service';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { SubmitAnswerDto } from './dto/submit-answer.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Live Quiz Engine')
@Controller('quizzes')
export class QuizzesController {
  constructor(private readonly quizzesService: QuizzesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new timed quiz with rounds & questions' })
  @ApiResponse({ status: 201, description: 'Quiz created successfully' })
  async createQuiz(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateQuizDto,
  ) {
    return this.quizzesService.createQuiz(userId, dto);
  }

  @Post(':quizId/start')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Start a live quiz' })
  @ApiParam({ name: 'quizId', description: 'Quiz ID' })
  @ApiResponse({ status: 200, description: 'Quiz started' })
  async startQuiz(
    @CurrentUser('userId') userId: string,
    @Param('quizId') quizId: string,
  ) {
    return this.quizzesService.startQuiz(userId, quizId);
  }

  @Post(':quizId/next-round')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Advance quiz to next round' })
  @ApiParam({ name: 'quizId', description: 'Quiz ID' })
  @ApiResponse({ status: 200, description: 'Quiz advanced to next round' })
  async nextRound(
    @CurrentUser('userId') userId: string,
    @Param('quizId') quizId: string,
  ) {
    return this.quizzesService.nextRound(userId, quizId);
  }

  @Post(':quizId/submit')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit answer for active quiz question' })
  @ApiParam({ name: 'quizId', description: 'Quiz ID' })
  @ApiResponse({ status: 200, description: 'Answer submitted and scored' })
  async submitAnswer(
    @CurrentUser('userId') userId: string,
    @CurrentUser('username') username: string,
    @Param('quizId') quizId: string,
    @Body() dto: SubmitAnswerDto,
  ) {
    return this.quizzesService.submitAnswer(userId, quizId, dto, username);
  }

  @Post(':quizId/stop')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'End quiz, calculate final rankings & winners' })
  @ApiParam({ name: 'quizId', description: 'Quiz ID' })
  @ApiResponse({ status: 200, description: 'Quiz ended and winners announced' })
  async stopQuiz(
    @CurrentUser('userId') userId: string,
    @Param('quizId') quizId: string,
  ) {
    return this.quizzesService.stopQuiz(userId, quizId);
  }

  @Get(':quizId/leaderboard')
  @ApiOperation({ summary: 'Get quiz participant leaderboard' })
  @ApiParam({ name: 'quizId', description: 'Quiz ID' })
  @ApiResponse({ status: 200, description: 'Quiz leaderboard' })
  async getLeaderboard(@Param('quizId') quizId: string) {
    return this.quizzesService.getLeaderboard(quizId);
  }

  @Get(':quizId')
  @ApiOperation({ summary: 'Get quiz details and questions' })
  @ApiParam({ name: 'quizId', description: 'Quiz ID' })
  @ApiResponse({ status: 200, description: 'Quiz details' })
  async getQuizDetails(@Param('quizId') quizId: string) {
    return this.quizzesService.getQuizDetails(quizId);
  }

  @Get('rooms/:roomId/active')
  @ApiOperation({ summary: 'Get currently active quiz for a room' })
  @ApiParam({ name: 'roomId', description: 'Room ID' })
  @ApiResponse({ status: 200, description: 'Active room quiz or null' })
  async getRoomActiveQuiz(@Param('roomId') roomId: string) {
    return this.quizzesService.getRoomActiveQuiz(roomId);
  }
}
