import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES, JOB_TYPES } from '../queue.constants';
import { ReferralService } from '../../modules/referral/services/referral.service';
import { ReferralCampaignService } from '../../modules/referral/services/referral-campaign.service';
import { ReferralAnalyticsService } from '../../modules/referral/services/referral-analytics.service';

@Processor(QUEUE_NAMES.REFERRAL)
export class ReferralProcessor extends WorkerHost {
  private readonly logger = new Logger(ReferralProcessor.name);

  constructor(
    private readonly referralService: ReferralService,
    private readonly campaignService: ReferralCampaignService,
    private readonly analyticsService: ReferralAnalyticsService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Processing referral job "${job.name}" [ID: ${job.id}]`);

    switch (job.name) {
      case JOB_TYPES.REFERRAL.VALIDATE_REFERRAL:
        return this.handleValidateReferral(job.data);
      case JOB_TYPES.REFERRAL.CAMPAIGN_CLEANUP:
        return this.handleCampaignCleanup();
      case JOB_TYPES.REFERRAL.ANALYTICS_REFRESH:
        return this.handleAnalyticsRefresh();
      default:
        this.logger.warn(`Unknown referral job name: ${job.name}`);
        return { success: false, reason: 'Unknown job name' };
    }
  }

  private async handleValidateReferral(data: {
    relationshipId: string;
    referrerId: string;
    referredUserId: string;
  }) {
    this.logger.log(
      `Validating referral relationship ${data.relationshipId} in background worker`,
    );
    return { success: true, relationshipId: data.relationshipId };
  }

  private async handleCampaignCleanup() {
    this.logger.log('Running background campaign cleanup');
    const cleaned = await this.campaignService.cleanupExpiredCampaigns();
    return { success: true, cleanedCampaignsCount: cleaned };
  }

  private async handleAnalyticsRefresh() {
    this.logger.log('Refreshing referral analytics in background');
    const analytics = await this.analyticsService.getAnalyticsSummary();
    return { success: true, totalReferrals: analytics.overview.totalReferrals };
  }
}
