import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DailyCheckIn } from '../entities/daily-check-in.entity';
import { RewardEngineService, RewardPayload } from './reward-engine.service';
import { XpEngineService } from './xp-engine.service';

export interface CheckInCycleReward {
  day: number;
  coins: number;
  diamonds: number;
  xp: number;
  vipDays: number;
}

export const CHECK_IN_CYCLE_REWARDS: CheckInCycleReward[] = [
  { day: 1, coins: 50, diamonds: 0, xp: 10, vipDays: 0 },
  { day: 2, coins: 100, diamonds: 0, xp: 20, vipDays: 0 },
  { day: 3, coins: 150, diamonds: 5, xp: 30, vipDays: 0 },
  { day: 4, coins: 200, diamonds: 0, xp: 40, vipDays: 0 },
  { day: 5, coins: 250, diamonds: 10, xp: 50, vipDays: 0 },
  { day: 6, coins: 300, diamonds: 0, xp: 60, vipDays: 0 },
  { day: 7, coins: 500, diamonds: 20, xp: 100, vipDays: 1 },
];

@Injectable()
export class DailyCheckInService {
  private readonly logger = new Logger(DailyCheckInService.name);

  constructor(
    @InjectRepository(DailyCheckIn)
    private readonly checkInRepository: Repository<DailyCheckIn>,
    private readonly rewardEngineService: RewardEngineService,
    private readonly xpEngineService: XpEngineService,
  ) {}

  private getTodayStr(): string {
    return new Date().toISOString().split('T')[0];
  }

  private getYesterdayStr(): string {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }

  async getCheckInStatus(userId: string) {
    const today = this.getTodayStr();
    let record = await this.checkInRepository.findOne({ where: { userId } });

    if (!record) {
      record = this.checkInRepository.create({
        userId,
        cycleDay: 1,
        lastCheckInDate: null,
        totalCheckIns: 0,
      });
      record = await this.checkInRepository.save(record);
    }

    const canClaimToday = record.lastCheckInDate !== today;

    return {
      userId: record.userId,
      cycleDay: record.cycleDay,
      lastCheckInDate: record.lastCheckInDate,
      totalCheckIns: record.totalCheckIns,
      canClaimToday,
      rewardsSchedule: CHECK_IN_CYCLE_REWARDS,
    };
  }

  async claimDailyCheckIn(userId: string) {
    const today = this.getTodayStr();
    const yesterday = this.getYesterdayStr();

    let record = await this.checkInRepository.findOne({ where: { userId } });
    if (!record) {
      record = this.checkInRepository.create({
        userId,
        cycleDay: 1,
        lastCheckInDate: null,
        totalCheckIns: 0,
      });
    }

    if (record.lastCheckInDate === today) {
      throw new BadRequestException(
        'Daily check-in reward already claimed today',
      );
    }

    if (record.lastCheckInDate === yesterday) {
      record.cycleDay = record.cycleDay >= 7 ? 1 : record.cycleDay + 1;
    } else {
      // Missed a day or first check in
      record.cycleDay = 1;
    }

    const dayReward =
      CHECK_IN_CYCLE_REWARDS.find((r) => r.day === record.cycleDay) ||
      CHECK_IN_CYCLE_REWARDS[0];

    record.lastCheckInDate = today;
    record.totalCheckIns += 1;

    const payload: RewardPayload = {
      coins: dayReward.coins,
      diamonds: dayReward.diamonds,
      xp: dayReward.xp,
      vipDays: dayReward.vipDays,
      metadata: `Day ${record.cycleDay} Daily Check-In Reward`,
    };

    const auditLogs = await this.rewardEngineService.distributeReward(
      userId,
      payload,
      'daily_checkin',
      `checkin-${today}`,
      `reward:daily_checkin:${today}:${userId}`,
    );

    record = await this.checkInRepository.save(record);

    if (dayReward.xp > 0) {
      await this.xpEngineService.addXp(userId, dayReward.xp, 'daily_checkin');
    }

    this.logger.log(
      `User ${userId} claimed Day ${record.cycleDay} check-in reward.`,
    );

    return {
      success: true,
      cycleDay: record.cycleDay,
      claimedReward: dayReward,
      totalCheckIns: record.totalCheckIns,
      auditLogs,
    };
  }
}
