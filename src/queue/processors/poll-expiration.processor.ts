import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../queue.constants';

@Processor(QUEUE_NAMES.POLL_EXPIRATION)
export class PollExpirationProcessor extends WorkerHost {
  private readonly logger = new Logger(PollExpirationProcessor.name);

  async process(job: Job<{ pollId?: string }, any, string>): Promise<any> {
    this.logger.log(`Processing poll expiration job ${job.id} for poll ${job.data?.pollId}`);

    return {
      status: 'completed',
      pollId: job.data?.pollId,
      expiredAt: new Date().toISOString(),
    };
  }
}
