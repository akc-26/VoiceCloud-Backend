import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../queue.constants';

export interface AgencyVerificationJobData {
  applicationId?: string;
  agencyId?: string;
}

@Injectable()
@Processor(QUEUE_NAMES.AGENCY_VERIFICATION)
export class AgencyVerificationProcessor extends WorkerHost {
  private readonly logger = new Logger(AgencyVerificationProcessor.name);

  async process(job: Job<AgencyVerificationJobData>): Promise<any> {
    this.logger.log(
      `[AgencyVerificationProcessor] Processing verification for application ${job.data.applicationId || job.data.agencyId}`,
    );
    return { success: true, processedAt: new Date() };
  }
}
