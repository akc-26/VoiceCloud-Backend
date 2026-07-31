import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { SeasonalEvent } from '../entities/seasonal-event.entity';
import { CreateSeasonalEventDto } from '../dto/create-seasonal-event.dto';
import { UpdateSeasonalEventDto } from '../dto/update-seasonal-event.dto';
import { RewardEngineService } from './reward-engine.service';
import { UserXpProgress } from '../entities/user-xp-progress.entity';
import { EventsGateway } from '../../../common/events/events.gateway';

@Injectable()
export class SeasonalEventService {
  private readonly logger = new Logger(SeasonalEventService.name);

  constructor(
    @InjectRepository(SeasonalEvent)
    private readonly seasonalRepo: Repository<SeasonalEvent>,
    @InjectRepository(UserXpProgress)
    private readonly userXpRepo: Repository<UserXpProgress>,
    private readonly rewardEngineService: RewardEngineService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async getActiveSeason(): Promise<SeasonalEvent | null> {
    const now = new Date();
    return this.seasonalRepo.findOne({
      where: {
        isActive: true,
        startDate: LessThanOrEqual(now),
        endDate: MoreThanOrEqual(now),
      },
      order: { startDate: 'DESC' },
    });
  }

  async listSeasons(): Promise<SeasonalEvent[]> {
    return this.seasonalRepo.find({
      order: { startDate: 'DESC' },
    });
  }

  async createSeason(dto: CreateSeasonalEventDto): Promise<SeasonalEvent> {
    const season = this.seasonalRepo.create({
      title: dto.title,
      description: dto.description,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      xpMultiplier: dto.xpMultiplier ?? 1.5,
      coinMultiplier: dto.coinMultiplier ?? 1.2,
      limitedAchievements: dto.limitedAchievements,
      rewards: dto.rewards,
      isActive: dto.isActive ?? true,
    });
    const saved = await this.seasonalRepo.save(season);

    if (this.eventsGateway?.server) {
      this.eventsGateway.server.emit('season_started', {
        seasonId: saved.id,
        title: saved.title,
        startDate: saved.startDate,
        endDate: saved.endDate,
        xpMultiplier: saved.xpMultiplier,
        timestamp: new Date().toISOString(),
      });
    }

    return saved;
  }

  async updateSeason(
    id: string,
    dto: UpdateSeasonalEventDto,
  ): Promise<SeasonalEvent> {
    const season = await this.seasonalRepo.findOne({ where: { id } });
    if (!season) {
      throw new NotFoundException(`Seasonal event ${id} not found`);
    }

    if (dto.title !== undefined) season.title = dto.title;
    if (dto.description !== undefined) season.description = dto.description;
    if (dto.startDate !== undefined) season.startDate = new Date(dto.startDate);
    if (dto.endDate !== undefined) season.endDate = new Date(dto.endDate);
    if (dto.xpMultiplier !== undefined) season.xpMultiplier = dto.xpMultiplier;
    if (dto.coinMultiplier !== undefined)
      season.coinMultiplier = dto.coinMultiplier;
    if (dto.limitedAchievements !== undefined)
      season.limitedAchievements = dto.limitedAchievements;
    if (dto.rewards !== undefined) season.rewards = dto.rewards;
    if (dto.isActive !== undefined) season.isActive = dto.isActive;

    return this.seasonalRepo.save(season);
  }

  async getSeasonalLeaderboard(seasonId?: string) {
    let season: SeasonalEvent | null = null;
    if (seasonId) {
      season = await this.seasonalRepo.findOne({ where: { id: seasonId } });
    } else {
      season = await this.getActiveSeason();
    }

    const topUsers = await this.userXpRepo.find({
      order: { totalXp: 'DESC' },
      take: 20,
    });

    return {
      season: season || { title: 'Standard Season', xpMultiplier: 1.0 },
      leaderboard: topUsers.map((u, index) => ({
        rank: index + 1,
        userId: u.userId,
        level: u.level,
        seasonalXp: Math.round(u.totalXp * (season?.xpMultiplier || 1.0)),
        levelTitle: u.levelTitle,
      })),
    };
  }

  async triggerSeasonRollover() {
    this.logger.log('Executing Seasonal Event Rollover check...');
    const now = new Date();

    const endedSeasons = await this.seasonalRepo.find({
      where: {
        isActive: true,
        endDate: LessThanOrEqual(now),
      },
    });

    for (const season of endedSeasons) {
      season.isActive = false;
      await this.seasonalRepo.save(season);

      this.logger.log(`Season ended: ${season.title} (${season.id})`);

      // Award top 3 users seasonal rewards
      const topUsers = await this.userXpRepo.find({
        order: { totalXp: 'DESC' },
        take: 3,
      });

      for (let i = 0; i < topUsers.length; i++) {
        const rank = i + 1;
        const rewardCoins = 10000 / rank;
        const rewardDiamonds = 500 / rank;

        await this.rewardEngineService.distributeReward(
          topUsers[i].userId,
          {
            coins: rewardCoins,
            diamonds: rewardDiamonds,
            badge: `season_champion_rank_${rank}`,
            metadata: `Season Champion Rank ${rank} reward for ${season.title}`,
          },
          'seasonal_reward',
          season.id,
        );
      }

      if (this.eventsGateway?.server) {
        this.eventsGateway.server.emit('season_ended', {
          seasonId: season.id,
          title: season.title,
          endedAt: season.endDate,
          timestamp: new Date().toISOString(),
        });
      }
    }

    return { success: true, processedEndedSeasons: endedSeasons.length };
  }
}
