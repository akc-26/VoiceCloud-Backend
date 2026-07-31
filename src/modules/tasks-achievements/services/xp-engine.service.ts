import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserXpProgress } from '../entities/user-xp-progress.entity';
import { RewardEngineService } from './reward-engine.service';
import { EventsGateway } from '../../../common/events/events.gateway';

export interface XpProgressResponse {
  userId: string;
  level: number;
  currentXp: number;
  requiredXp: number;
  totalXp: number;
  progressPercent: number;
  levelTitle: string;
  leveledUp?: boolean;
}

@Injectable()
export class XpEngineService {
  private readonly logger = new Logger(XpEngineService.name);

  constructor(
    @InjectRepository(UserXpProgress)
    private readonly userXpRepository: Repository<UserXpProgress>,
    private readonly rewardEngineService: RewardEngineService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  public getRequiredXpForLevel(level: number): number {
    if (level >= 50) return 999999;
    return 100 + (level - 1) * 150;
  }

  public getLevelTitle(level: number): string {
    if (level <= 5) return 'Novice Voice';
    if (level <= 10) return 'Bronze Speaker';
    if (level <= 15) return 'Silver Host';
    if (level <= 20) return 'Gold Broadcaster';
    if (level <= 25) return 'Platinum Vocalist';
    if (level <= 30) return 'Diamond Superstar';
    if (level <= 35) return 'Master Maestro';
    if (level <= 40) return 'Grandmaster Idol';
    if (level <= 45) return 'Legend Icon';
    return 'Mythic Voice';
  }

  async getUserXpProgress(userId: string): Promise<XpProgressResponse> {
    let xpRecord = await this.userXpRepository.findOne({ where: { userId } });
    if (!xpRecord) {
      xpRecord = this.userXpRepository.create({
        userId,
        level: 1,
        currentXp: 0,
        totalXp: 0,
        levelTitle: this.getLevelTitle(1),
      });
      xpRecord = await this.userXpRepository.save(xpRecord);
    }

    const requiredXp = this.getRequiredXpForLevel(xpRecord.level);
    const progressPercent = Math.min(
      100,
      Math.round((xpRecord.currentXp / requiredXp) * 100),
    );

    return {
      userId: xpRecord.userId,
      level: xpRecord.level,
      currentXp: xpRecord.currentXp,
      requiredXp,
      totalXp: xpRecord.totalXp,
      progressPercent,
      levelTitle: xpRecord.levelTitle,
    };
  }

  async addXp(
    userId: string,
    amount: number,
    source: string,
  ): Promise<XpProgressResponse> {
    let xpRecord = await this.userXpRepository.findOne({ where: { userId } });
    if (!xpRecord) {
      xpRecord = this.userXpRepository.create({
        userId,
        level: 1,
        currentXp: 0,
        totalXp: 0,
        levelTitle: this.getLevelTitle(1),
      });
    }

    xpRecord.totalXp += amount;
    xpRecord.currentXp += amount;

    let leveledUp = false;
    const oldLevel = xpRecord.level;

    while (
      xpRecord.level < 50 &&
      xpRecord.currentXp >= this.getRequiredXpForLevel(xpRecord.level)
    ) {
      const required = this.getRequiredXpForLevel(xpRecord.level);
      xpRecord.currentXp -= required;
      xpRecord.level += 1;
      leveledUp = true;
    }

    if (xpRecord.level >= 50) {
      xpRecord.level = 50;
    }

    xpRecord.levelTitle = this.getLevelTitle(xpRecord.level);
    await this.userXpRepository.save(xpRecord);

    if (leveledUp) {
      this.logger.log(
        `User ${userId} leveled up from ${oldLevel} to ${xpRecord.level}!`,
      );

      // Award Level Up rewards
      const coinReward = xpRecord.level * 50;
      const diamondReward = xpRecord.level * 5;

      await this.rewardEngineService.distributeReward(
        userId,
        {
          coins: coinReward,
          diamonds: diamondReward,
          metadata: `Level ${xpRecord.level} level up reward`,
        },
        'level_up',
        `level-${xpRecord.level}`,
      );

      // Broadcast WebSocket level_up
      if (this.eventsGateway?.server) {
        this.eventsGateway.server.emit('level_up', {
          userId,
          previousLevel: oldLevel,
          newLevel: xpRecord.level,
          levelTitle: xpRecord.levelTitle,
          coinReward,
          diamondReward,
          timestamp: new Date().toISOString(),
        });
      }
    }

    const requiredXp = this.getRequiredXpForLevel(xpRecord.level);
    const progressPercent = Math.min(
      100,
      Math.round((xpRecord.currentXp / requiredXp) * 100),
    );

    return {
      userId: xpRecord.userId,
      level: xpRecord.level,
      currentXp: xpRecord.currentXp,
      requiredXp,
      totalXp: xpRecord.totalXp,
      progressPercent,
      levelTitle: xpRecord.levelTitle,
      leveledUp,
    };
  }
}
