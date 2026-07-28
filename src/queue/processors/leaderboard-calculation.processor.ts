import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../queue.constants';

@Processor(QUEUE_NAMES.LEADERBOARD_CALCULATION)
export class LeaderboardCalculationProcessor extends WorkerHost {
  private readonly logger = new Logger(LeaderboardCalculationProcessor.name);

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Processing leaderboard calculation job ${job.id} - ${job.name}`);

    // Periodic leaderboard recalculation for quizzes and gifting ranks
    return {
      status: 'completed',
      jobId: job.id,
      recalculatedAt: new Date().toISOString(),
    };
  }
}
