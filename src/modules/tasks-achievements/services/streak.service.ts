import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserStreak, StreakType } from '../entities/user-streak.entity';
import { RewardEngineService } from './reward-engine.service';
import { XpEngineService } from './xp-engine.service';
import { EventsGateway } from '../../../common/events/events.gateway';

@Injectable()
export class StreakService {
  private readonly logger = new Logger(StreakService.name);

  constructor(
    @InjectRepository(UserStreak)
    private readonly userStreakRepository: Repository<UserStreak>,
    private readonly rewardEngineService: RewardEngineService,
    private readonly xpEngineService: XpEngineService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  private getTodayStr(): string {
    return new Date().toISOString().split('T')[0];
  }

  private getYesterdayStr(): string {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }

  async getUserStreaks(userId: string): Promise<UserStreak[]> {
    const types = Object.values(StreakType);
    const existing = await this.userStreakRepository.find({
      where: { userId },
    });

    const existingMap = new Map(existing.map((s) => [s.streakType, s]));
    const result: UserStreak[] = [];

    for (const type of types) {
      if (existingMap.has(type)) {
        result.push(existingMap.get(type));
      } else {
        const newStreak = this.userStreakRepository.create({
          userId,
          streakType: type,
          currentStreak: 0,
          longestStreak: 0,
          freezeCount: 0,
          isFrozen: false,
        });
        result.push(await this.userStreakRepository.save(newStreak));
      }
    }

    return result;
  }

  async recordStreakActivity(
    userId: string,
    streakType: StreakType,
  ): Promise<UserStreak> {
    const today = this.getTodayStr();
    const yesterday = this.getYesterdayStr();

    let streak = await this.userStreakRepository.findOne({
      where: { userId, streakType },
    });

    if (!streak) {
      streak = this.userStreakRepository.create({
        userId,
        streakType,
        currentStreak: 1,
        longestStreak: 1,
        lastActivityDate: today,
        freezeCount: 0,
        isFrozen: false,
      });
      streak = await this.userStreakRepository.save(streak);
      this.broadcastStreakUpdate(userId, streak);
      return streak;
    }

    if (streak.lastActivityDate === today) {
      return streak; // Already recorded today
    }

    if (streak.lastActivityDate === yesterday) {
      streak.currentStreak += 1;
    } else if (streak.isFrozen || streak.freezeCount > 0) {
      // Use streak freeze!
      if (streak.freezeCount > 0) streak.freezeCount -= 1;
      streak.isFrozen = false;
      streak.currentStreak += 1;
      this.logger.log(`Streak freeze used for user ${userId} on ${streakType}`);
    } else {
      // Reset streak
      streak.currentStreak = 1;
    }

    if (streak.currentStreak > streak.longestStreak) {
      streak.longestStreak = streak.currentStreak;
    }

    streak.lastActivityDate = today;
    streak = await this.userStreakRepository.save(streak);

    // Streak Milestone Rewards (e.g. 3, 7, 14, 30 days)
    if ([3, 7, 14, 30, 60, 100].includes(streak.currentStreak)) {
      const bonusCoins = streak.currentStreak * 20;
      const bonusXp = streak.currentStreak * 10;
      await this.rewardEngineService.distributeReward(
        userId,
        {
          coins: bonusCoins,
          xp: bonusXp,
          metadata: `${streak.currentStreak}-day ${streakType} streak milestone reward`,
        },
        'streak_milestone',
        `${streakType}-${streak.currentStreak}`,
        `reward:streak_milestone:${streakType}:${streak.currentStreak}:${userId}`,
      );
      await this.xpEngineService.addXp(userId, bonusXp, 'streak_milestone');
    }

    this.broadcastStreakUpdate(userId, streak);
    return streak;
  }

  async freezeStreak(
    userId: string,
    streakType: StreakType,
  ): Promise<UserStreak> {
    let streak = await this.userStreakRepository.findOne({
      where: { userId, streakType },
    });

    if (!streak) {
      streak = this.userStreakRepository.create({
        userId,
        streakType,
        currentStreak: 0,
        longestStreak: 0,
        freezeCount: 1,
        isFrozen: true,
      });
    } else {
      streak.freezeCount += 1;
      streak.isFrozen = true;
    }

    streak = await this.userStreakRepository.save(streak);
    this.broadcastStreakUpdate(userId, streak);
    return streak;
  }

  async recoverStreak(
    userId: string,
    streakType: StreakType,
  ): Promise<UserStreak> {
    let streak = await this.userStreakRepository.findOne({
      where: { userId, streakType },
    });

    if (!streak) {
      throw new BadRequestException('No streak history found to recover.');
    }

    streak.currentStreak = Math.max(1, streak.longestStreak);
    streak.lastActivityDate = this.getTodayStr();
    streak.isFrozen = false;

    streak = await this.userStreakRepository.save(streak);
    this.broadcastStreakUpdate(userId, streak);
    return streak;
  }

  private broadcastStreakUpdate(userId: string, streak: UserStreak) {
    if (this.eventsGateway?.server) {
      this.eventsGateway.server.emit('streak_updated', {
        userId,
        streakType: streak.streakType,
        currentStreak: streak.currentStreak,
        longestStreak: streak.longestStreak,
        isFrozen: streak.isFrozen,
        freezeCount: streak.freezeCount,
        timestamp: new Date().toISOString(),
      });
    }
  }
}
