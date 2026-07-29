import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../queue.constants';

export interface AgencySettlementJobData {
  agencyId?: string;
  settlementPeriod?: string;
}

@Injectable()
@Processor(QUEUE_NAMES.AGENCY_SETTLEMENT)
export class AgencySettlementProcessor extends WorkerHost {
  private readonly logger = new Logger(AgencySettlementProcessor.name);

  async process(job: Job<AgencySettlementJobData>): Promise<any> {
    this.logger.log(
      `[AgencySettlementProcessor] Processing settlement for agency ${job.data.agencyId || 'ALL'}, period ${job.data.settlementPeriod}`,
    );
    return {
      success: true,
      agencyId: job.data.agencyId,
      processedAt: new Date(),
    };
  }
}
