import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AchievementDefinition,
  AchievementRarity,
} from '../entities/achievement-definition.entity';
import { UserAchievement } from '../entities/user-achievement.entity';
import { CreateAchievementDefinitionDto } from '../dto/create-achievement-definition.dto';
import { UpdateAchievementDefinitionDto } from '../dto/update-achievement-definition.dto';
import { RewardEngineService } from './reward-engine.service';
import { XpEngineService } from './xp-engine.service';
import { EventsGateway } from '../../../common/events/events.gateway';

@Injectable()
export class AchievementService {
  private readonly logger = new Logger(AchievementService.name);

  constructor(
    @InjectRepository(AchievementDefinition)
    private readonly achievementRepo: Repository<AchievementDefinition>,
    @InjectRepository(UserAchievement)
    private readonly userAchievementRepo: Repository<UserAchievement>,
    private readonly rewardEngineService: RewardEngineService,
    private readonly xpEngineService: XpEngineService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async getAllAchievements(userId?: string) {
    const definitions = await this.achievementRepo.find({
      where: { isActive: true },
      order: { displayOrder: 'ASC', createdAt: 'DESC' },
    });

    if (!userId) {
      return definitions.map((def) => ({
        ...def,
        isUnlocked: false,
        unlockedAt: null,
      }));
    }

    const userUnlocks = await this.userAchievementRepo.find({
      where: { userId },
    });

    const unlockMap = new Map(
      userUnlocks.map((u) => [u.achievementId, u.unlockedAt]),
    );

    return definitions.map((def) => ({
      ...def,
      isUnlocked: unlockMap.has(def.id),
      unlockedAt: unlockMap.get(def.id) || null,
    }));
  }

  async checkAchievementsForEvent(
    userId: string,
    eventKey: string,
    currentCumulativeCount: number,
  ): Promise<UserAchievement[]> {
    const matchingDefs = await this.achievementRepo.find({
      where: { eventKey, isActive: true },
    });

    if (!matchingDefs || matchingDefs.length === 0) {
      return [];
    }

    const newUnlocks: UserAchievement[] = [];

    for (const def of matchingDefs) {
      if (currentCumulativeCount >= def.targetCount) {
        // Check duplicate unlock
        const existing = await this.userAchievementRepo.findOne({
          where: { userId, achievementId: def.id },
        });

        if (!existing) {
          try {
            const unlock = this.userAchievementRepo.create({
              userId,
              achievementId: def.id,
              unlockedAt: new Date(),
            });
            const saved = await this.userAchievementRepo.save(unlock);
            newUnlocks.push(saved);

            this.logger.log(
              `User ${userId} unlocked achievement: ${def.title} (${def.rarity})`,
            );

            // Distribute rewards
            await this.rewardEngineService.distributeReward(
              userId,
              {
                coins: def.coinReward,
                diamonds: def.diamondReward,
                xp: def.xpBonus,
                profileFrame: def.rewardProfileFrame,
                chatBubble: def.rewardChatBubble,
                entranceEffect: def.rewardEntranceEffect,
                exclusiveSticker: def.rewardSticker,
                badge: def.badge,
                metadata: `Achievement unlocked: ${def.title}`,
              },
              'achievement_unlock',
              def.id,
            );

            if (def.xpBonus > 0) {
              await this.xpEngineService.addXp(
                userId,
                def.xpBonus,
                'achievement_unlock',
              );
            }

            // Broadcast WebSocket event
            if (this.eventsGateway?.server) {
              this.eventsGateway.server.emit('achievement_unlocked', {
                userId,
                achievementId: def.id,
                title: def.title,
                rarity: def.rarity,
                badge: def.badge,
                icon: def.icon,
                frame: def.frame,
                timestamp: new Date().toISOString(),
              });
            }
          } catch (err) {
            this.logger.warn(
              `Duplicate achievement unlock prevented for user ${userId}, achievement ${def.id}: ${err.message}`,
            );
          }
        }
      }
    }

    return newUnlocks;
  }

  // Admin CRUD Operations
  async createAchievement(dto: CreateAchievementDefinitionDto) {
    const def = this.achievementRepo.create(dto);
    return this.achievementRepo.save(def);
  }

  async updateAchievement(id: string, dto: UpdateAchievementDefinitionDto) {
    const def = await this.achievementRepo.findOne({ where: { id } });
    if (!def) {
      throw new NotFoundException(`Achievement definition ${id} not found`);
    }
    Object.assign(def, dto);
    return this.achievementRepo.save(def);
  }

  async deleteAchievement(id: string) {
    const result = await this.achievementRepo.delete({ id });
    if (result.affected === 0) {
      throw new NotFoundException(`Achievement definition ${id} not found`);
    }
    return { success: true, id };
  }
}
