import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Quiz, QuizStatus } from './entities/quiz.entity';
import { QuizQuestion } from './entities/quiz-question.entity';
import { QuizAnswer } from './entities/quiz-answer.entity';
import { QuizParticipantScore } from './entities/quiz-participant-score.entity';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { SubmitAnswerDto } from './dto/submit-answer.dto';
import { EventsGateway } from '../../common/events/events.gateway';

@Injectable()
export class QuizzesService {
  constructor(
    @InjectRepository(Quiz)
    private readonly quizRepository: Repository<Quiz>,
    @InjectRepository(QuizQuestion)
    private readonly questionRepository: Repository<QuizQuestion>,
    @InjectRepository(QuizAnswer)
    private readonly answerRepository: Repository<QuizAnswer>,
    @InjectRepository(QuizParticipantScore)
    private readonly scoreRepository: Repository<QuizParticipantScore>,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async createQuiz(userId: string, dto: CreateQuizDto): Promise<Quiz> {
    const quiz = this.quizRepository.create({
      roomId: dto.roomId,
      creatorId: userId,
      title: dto.title,
      description: dto.description,
      status: QuizStatus.DRAFT,
      currentRound: 1,
      totalRounds: dto.totalRounds || 1,
      questions: dto.questions.map((q) =>
        this.questionRepository.create({
          roundNumber: q.roundNumber,
          questionText: q.questionText,
          options: q.options,
          correctOptionIndex: q.correctOptionIndex,
          durationSeconds: q.durationSeconds || 30,
          points: q.points || 100,
        }),
      ),
    });

    const saved = await this.quizRepository.save(quiz);

    this.eventsGateway.broadcastToRoom(dto.roomId, 'quiz:created', {
      quizId: saved.id,
      title: saved.title,
    });

    return saved;
  }

  async startQuiz(userId: string, quizId: string): Promise<Quiz> {
    const quiz = await this.quizRepository.findOne({
      where: { id: quizId },
      relations: { questions: true },
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }
    if (quiz.creatorId !== userId) {
      throw new ForbiddenException('Only quiz creator can start the quiz');
    }

    quiz.status = QuizStatus.ACTIVE;
    quiz.currentRound = 1;
    const updated = await this.quizRepository.save(quiz);

    const round1Questions = quiz.questions.filter((q) => q.roundNumber === 1);

    this.eventsGateway.broadcastToRoom(quiz.roomId, 'quiz:started', {
      quizId: quiz.id,
      title: quiz.title,
      currentRound: 1,
      totalRounds: quiz.totalRounds,
      roundQuestionsCount: round1Questions.length,
    });

    return updated;
  }

  async nextRound(userId: string, quizId: string): Promise<Quiz> {
    const quiz = await this.quizRepository.findOne({
      where: { id: quizId },
      relations: { questions: true },
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }
    if (quiz.creatorId !== userId) {
      throw new ForbiddenException('Only quiz creator can advance rounds');
    }

    if (quiz.currentRound >= quiz.totalRounds) {
      return this.stopQuiz(userId, quizId);
    }

    quiz.currentRound += 1;
    const updated = await this.quizRepository.save(quiz);

    const roundQuestions = quiz.questions.filter(
      (q) => q.roundNumber === quiz.currentRound,
    );

    this.eventsGateway.broadcastToRoom(quiz.roomId, 'quiz:round_started', {
      quizId: quiz.id,
      currentRound: quiz.currentRound,
      totalRounds: quiz.totalRounds,
      roundQuestionsCount: roundQuestions.length,
    });

    return updated;
  }

  async submitAnswer(
    userId: string,
    quizId: string,
    dto: SubmitAnswerDto,
    username?: string,
  ): Promise<{ isCorrect: boolean; pointsEarned: number; totalScore: number }> {
    const quiz = await this.quizRepository.findOne({ where: { id: quizId } });
    if (!quiz || quiz.status !== QuizStatus.ACTIVE) {
      throw new BadRequestException('Quiz is not currently active');
    }

    const question = await this.questionRepository.findOne({
      where: { id: dto.questionId, quizId },
    });
    if (!question) {
      throw new NotFoundException('Question not found in this quiz');
    }

    // Check if already answered
    const existing = await this.answerRepository.findOne({
      where: { questionId: dto.questionId, userId },
    });
    if (existing) {
      throw new BadRequestException('You have already answered this question');
    }

    const isCorrect = dto.selectedOptionIndex === question.correctOptionIndex;

    let pointsEarned = 0;
    if (isCorrect) {
      // Speed bonus: up to 50% bonus if answered quickly
      const speedRatio = Math.max(
        0,
        (question.durationSeconds - dto.timeTakenSeconds) /
          question.durationSeconds,
      );
      const speedBonus = Math.round(question.points * 0.5 * speedRatio);
      pointsEarned = question.points + speedBonus;
    }

    const answer = this.answerRepository.create({
      quizId,
      questionId: dto.questionId,
      userId,
      selectedOptionIndex: dto.selectedOptionIndex,
      isCorrect,
      timeTakenSeconds: dto.timeTakenSeconds,
      pointsEarned,
    });
    await this.answerRepository.save(answer);

    // Update participant total score
    let pScore = await this.scoreRepository.findOne({
      where: { quizId, userId },
    });
    if (!pScore) {
      pScore = this.scoreRepository.create({
        quizId,
        userId,
        username: username || `User_${userId.slice(0, 6)}`,
        totalScore: 0,
        correctAnswersCount: 0,
        rank: 0,
      });
    }

    pScore.totalScore += pointsEarned;
    if (isCorrect) {
      pScore.correctAnswersCount += 1;
    }
    await this.scoreRepository.save(pScore);

    // Recalculate ranks for this quiz
    await this.recalculateRanks(quizId);

    const updatedScore = await this.scoreRepository.findOne({
      where: { quizId, userId },
    });

    return {
      isCorrect,
      pointsEarned,
      totalScore: updatedScore?.totalScore || 0,
    };
  }

  async stopQuiz(userId: string, quizId: string): Promise<Quiz> {
    const quiz = await this.quizRepository.findOne({
      where: { id: quizId },
    });
    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }
    if (quiz.creatorId !== userId) {
      throw new ForbiddenException('Only quiz creator can stop the quiz');
    }

    quiz.status = QuizStatus.COMPLETED;
    const updated = await this.quizRepository.save(quiz);

    await this.recalculateRanks(quizId);

    const leaderboard = await this.getLeaderboard(quizId);
    const winners = leaderboard.slice(0, 3);

    this.eventsGateway.broadcastToRoom(quiz.roomId, 'quiz:completed', {
      quizId: quiz.id,
      title: quiz.title,
      winners,
      leaderboard,
    });

    return updated;
  }

  async getLeaderboard(quizId: string): Promise<QuizParticipantScore[]> {
    return this.scoreRepository.find({
      where: { quizId },
      order: { totalScore: 'DESC', correctAnswersCount: 'DESC' },
      take: 50,
    });
  }

  async getQuizDetails(quizId: string): Promise<Quiz> {
    const quiz = await this.quizRepository.findOne({
      where: { id: quizId },
      relations: { questions: true },
    });
    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }
    return quiz;
  }

  async getRoomActiveQuiz(roomId: string): Promise<Quiz | null> {
    return this.quizRepository.findOne({
      where: { roomId, status: QuizStatus.ACTIVE },
      relations: { questions: true },
      order: { createdAt: 'DESC' },
    });
  }

  private async recalculateRanks(quizId: string): Promise<void> {
    const scores = await this.scoreRepository.find({
      where: { quizId },
      order: { totalScore: 'DESC', correctAnswersCount: 'DESC' },
    });

    for (let i = 0; i < scores.length; i++) {
      scores[i].rank = i + 1;
      await this.scoreRepository.save(scores[i]);
    }
  }
}
