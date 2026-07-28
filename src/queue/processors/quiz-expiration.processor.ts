import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../queue.constants';

@Processor(QUEUE_NAMES.QUIZ_EXPIRATION)
export class QuizExpirationProcessor extends WorkerHost {
  private readonly logger = new Logger(QuizExpirationProcessor.name);

  async process(job: Job<{ quizId?: string }, any, string>): Promise<any> {
    this.logger.log(`Processing quiz expiration job ${job.id} for quiz ${job.data?.quizId}`);

    return {
      status: 'completed',
      quizId: job.data?.quizId,
      expiredAt: new Date().toISOString(),
    };
  }
}
