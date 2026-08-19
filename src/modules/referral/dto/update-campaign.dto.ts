import { PartialType } from '@nestjs/swagger';
import { CreateReferralCampaignDto } from './create-campaign.dto';

export class UpdateReferralCampaignDto extends PartialType(
  CreateReferralCampaignDto,
) {}
