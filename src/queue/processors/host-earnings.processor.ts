import { Processor, WorkerHost } from '@nestjs/bullmq';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../queue.constants';
import { HostFinancialAuthorityService } from '../../modules/hosts/host-financial-authority.service';

export interface HostEarningsJobData {
  hostProfileId?: string;
  userId?: string;
}

@Injectable()
@Processor(QUEUE_NAMES.HOST_EARNINGS)
export class HostEarningsProcessor extends WorkerHost {
  private readonly logger = new Logger(HostEarningsProcessor.name);

  constructor(
    private readonly hostFinancialAuthority: HostFinancialAuthorityService,
  ) {
    super();
  }

  async process(job: Job<HostEarningsJobData>): Promise<any> {
    if (!job.data.userId) {
      throw new BadRequestException(
        'Host earnings recovery requires the Host userId',
      );
    }
    const earnings = await this.hostFinancialAuthority.getEarnings(
      job.data.userId,
    );
    this.logger.log(
      `[HostEarningsProcessor] Reconciled Host earnings for ${job.data.userId}`,
    );
    return { success: true, earnings };
  }
}
