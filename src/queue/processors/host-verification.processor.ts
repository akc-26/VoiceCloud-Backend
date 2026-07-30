import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../queue.constants';

export interface HostVerificationJobData {
  hostProfileId?: string;
  documentType?: string;
}

@Injectable()
@Processor(QUEUE_NAMES.HOST_VERIFICATION)
export class HostVerificationProcessor extends WorkerHost {
  private readonly logger = new Logger(HostVerificationProcessor.name);

  async process(job: Job<HostVerificationJobData>): Promise<any> {
    this.logger.log(
      `[HostVerificationProcessor] Processing host verification for job ${job.id}`,
    );
    return { success: true, processedAt: new Date() };
  }
}
