import {
  Injectable,
  NotFoundException,
  Logger,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReferralCampaign } from '../entities';
import { CreateReferralCampaignDto, UpdateReferralCampaignDto, ReferralQueryDto } from '../dto';
import { EventsGateway } from '../../../common/events/events.gateway';
import { RedisService } from '../../../redis/redis.service';

@Injectable()
export class ReferralCampaignService {
  private readonly logger = new Logger(ReferralCampaignService.name);

  constructor(
    @InjectRepository(ReferralCampaign)
    private readonly campaignRepository: Repository<ReferralCampaign>,
    private readonly eventsGateway: EventsGateway,
    @Optional() private readonly redisService?: RedisService,
  ) {}

  async createCampaign(dto: CreateReferralCampaignDto): Promise<ReferralCampaign> {
    const campaign = this.campaignRepository.create({
      campaignName: dto.campaignName,
      description: dto.description || null,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      isActive: dto.isActive !== undefined ? dto.isActive : true,
      countryRestrictions: dto.countryRestrictions || [],
      rewardConfiguration: dto.rewardConfiguration || [],
      qualificationRules: dto.qualificationRules || {},
      referralLimits: dto.referralLimits || 0,
      dailyLimits: dto.dailyLimits || 0,
      globalLimits: dto.globalLimits || 0,
      currentTotalReferrals: 0,
    });

    const saved = await this.campaignRepository.save(campaign);

    if (saved.isActive) {
      this.eventsGateway.broadcastToAdmin('campaign_started', {
        campaignId: saved.id,
        campaignName: saved.campaignName,
      });
    }

    if (this.redisService) {
      await this.redisService.del('referral:campaign:active');
    }

    return saved;
  }

  async updateCampaign(
    id: string,
    dto: UpdateReferralCampaignDto,
  ): Promise<ReferralCampaign> {
    const campaign = await this.campaignRepository.findOne({ where: { id } });
    if (!campaign) {
      throw new NotFoundException(`Referral campaign '${id}' not found`);
    }

    if (dto.campaignName !== undefined) campaign.campaignName = dto.campaignName;
    if (dto.description !== undefined) campaign.description = dto.description;
    if (dto.startDate !== undefined) campaign.startDate = new Date(dto.startDate);
    if (dto.endDate !== undefined) campaign.endDate = new Date(dto.endDate);
    if (dto.isActive !== undefined) campaign.isActive = dto.isActive;
    if (dto.countryRestrictions !== undefined) campaign.countryRestrictions = dto.countryRestrictions;
    if (dto.rewardConfiguration !== undefined) campaign.rewardConfiguration = dto.rewardConfiguration;
    if (dto.qualificationRules !== undefined) campaign.qualificationRules = dto.qualificationRules;
    if (dto.referralLimits !== undefined) campaign.referralLimits = dto.referralLimits;
    if (dto.dailyLimits !== undefined) campaign.dailyLimits = dto.dailyLimits;
    if (dto.globalLimits !== undefined) campaign.globalLimits = dto.globalLimits;

    const updated = await this.campaignRepository.save(campaign);

    if (this.redisService) {
      await this.redisService.del('referral:campaign:active');
    }

    return updated;
  }

  async deleteCampaign(id: string): Promise<{ success: boolean }> {
    const res = await this.campaignRepository.delete(id);
    if (res.affected === 0) {
      throw new NotFoundException(`Referral campaign '${id}' not found`);
    }

    if (this.redisService) {
      await this.redisService.del('referral:campaign:active');
    }

    return { success: true };
  }

  async getCampaignById(id: string): Promise<ReferralCampaign> {
    const campaign = await this.campaignRepository.findOne({ where: { id } });
    if (!campaign) {
      throw new NotFoundException(`Referral campaign '${id}' not found`);
    }
    return campaign;
  }

  async listCampaigns(query: ReferralQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.campaignRepository.createQueryBuilder('camp');

    if (query.search) {
      qb.andWhere('camp.campaignName ILIKE :search', { search: `%${query.search}%` });
    }

    qb.orderBy('camp.createdAt', 'DESC');
    qb.skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getActiveCampaigns(): Promise<ReferralCampaign[]> {
    const now = new Date();
    const qb = this.campaignRepository.createQueryBuilder('camp');
    qb.where('camp.isActive = :isActive', { isActive: true });
    qb.andWhere('camp.startDate <= :now', { now });
    qb.andWhere('camp.endDate >= :now', { now });

    return qb.getMany();
  }

  async getMatchingCampaign(country?: string): Promise<ReferralCampaign | null> {
    const activeCampaigns = await this.getActiveCampaigns();
    if (activeCampaigns.length === 0) return null;

    for (const campaign of activeCampaigns) {
      if (
        campaign.globalLimits > 0 &&
        campaign.currentTotalReferrals >= campaign.globalLimits
      ) {
        continue;
      }

      if (
        campaign.countryRestrictions &&
        campaign.countryRestrictions.length > 0
      ) {
        if (!country || !campaign.countryRestrictions.includes(country.toUpperCase())) {
          continue;
        }
      }

      return campaign;
    }

    return null;
  }

  async cleanupExpiredCampaigns(): Promise<number> {
    const now = new Date();
    const expired = await this.campaignRepository
      .createQueryBuilder('camp')
      .where('camp.isActive = :isActive', { isActive: true })
      .andWhere('camp.endDate < :now', { now })
      .getMany();

    for (const c of expired) {
      c.isActive = false;
      await this.campaignRepository.save(c);

      this.eventsGateway.broadcastToAdmin('campaign_ended', {
        campaignId: c.id,
        campaignName: c.campaignName,
      });
    }

    return expired.length;
  }
}
