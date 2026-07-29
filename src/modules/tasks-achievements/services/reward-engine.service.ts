import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  RewardAuditLog,
  RewardType,
} from '../entities/reward-audit-log.entity';
import { User } from '../../users/entities/user.entity';
import { EventsGateway } from '../../../common/events/events.gateway';

export interface RewardPayload {
  coins?: number;
  diamonds?: number;
  xp?: number;
  vipDays?: number;
  profileFrame?: string;
  chatBubble?: string;
  entranceEffect?: string;
  exclusiveSticker?: string;
  badge?: string;
  metadata?: string;
}

@Injectable()
export class RewardEngineService {
  private readonly logger = new Logger(RewardEngineService.name);

  constructor(
    @InjectRepository(RewardAuditLog)
    private readonly rewardAuditLogRepository: Repository<RewardAuditLog>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async distributeReward(
    userId: string,
    payload: RewardPayload,
    source: string,
    sourceId?: string,
  ): Promise<RewardAuditLog[]> {
    const auditLogs: RewardAuditLog[] = [];

    // 1. Process Coins
    if (payload.coins && payload.coins > 0) {
      await this.userRepository.increment(
        { id: userId },
        'coins',
        payload.coins,
      );
      const log = this.rewardAuditLogRepository.create({
        userId,
        rewardType: RewardType.COINS,
        amount: payload.coins,
        source,
        sourceId,
        metadata: payload.metadata || `Coins earned via ${source}`,
      });
      auditLogs.push(await this.rewardAuditLogRepository.save(log));
    }

    // 2. Process Diamonds
    if (payload.diamonds && payload.diamonds > 0) {
      await this.userRepository.increment(
        { id: userId },
        'diamonds',
        payload.diamonds,
      );
      const log = this.rewardAuditLogRepository.create({
        userId,
        rewardType: RewardType.DIAMONDS,
        amount: payload.diamonds,
        source,
        sourceId,
        metadata: payload.metadata || `Diamonds earned via ${source}`,
      });
      auditLogs.push(await this.rewardAuditLogRepository.save(log));
    }

    // 3. Process XP (handled as audit record; caller may pass to XpEngine for level progress)
    if (payload.xp && payload.xp > 0) {
      const log = this.rewardAuditLogRepository.create({
        userId,
        rewardType: RewardType.XP,
        amount: payload.xp,
        source,
        sourceId,
        metadata: payload.metadata || `XP gained via ${source}`,
      });
      auditLogs.push(await this.rewardAuditLogRepository.save(log));
    }

    // 4. Process VIP Trial Days
    if (payload.vipDays && payload.vipDays > 0) {
      const log = this.rewardAuditLogRepository.create({
        userId,
        rewardType: RewardType.VIP_TRIAL,
        amount: payload.vipDays,
        source,
        sourceId,
        metadata:
          payload.metadata || `${payload.vipDays} VIP trial days granted`,
      });
      auditLogs.push(await this.rewardAuditLogRepository.save(log));
    }

    // 5. Profile Frame
    if (payload.profileFrame) {
      const log = this.rewardAuditLogRepository.create({
        userId,
        rewardType: RewardType.PROFILE_FRAME,
        amount: 1,
        source,
        sourceId,
        metadata: payload.profileFrame,
      });
      auditLogs.push(await this.rewardAuditLogRepository.save(log));
    }

    // 6. Chat Bubble
    if (payload.chatBubble) {
      const log = this.rewardAuditLogRepository.create({
        userId,
        rewardType: RewardType.CHAT_BUBBLE,
        amount: 1,
        source,
        sourceId,
        metadata: payload.chatBubble,
      });
      auditLogs.push(await this.rewardAuditLogRepository.save(log));
    }

    // 7. Entrance Effect
    if (payload.entranceEffect) {
      const log = this.rewardAuditLogRepository.create({
        userId,
        rewardType: RewardType.ENTRANCE_EFFECT,
        amount: 1,
        source,
        sourceId,
        metadata: payload.entranceEffect,
      });
      auditLogs.push(await this.rewardAuditLogRepository.save(log));
    }

    // 8. Exclusive Sticker
    if (payload.exclusiveSticker) {
      const log = this.rewardAuditLogRepository.create({
        userId,
        rewardType: RewardType.EXCLUSIVE_STICKER,
        amount: 1,
        source,
        sourceId,
        metadata: payload.exclusiveSticker,
      });
      auditLogs.push(await this.rewardAuditLogRepository.save(log));
    }

    // 9. Badge
    if (payload.badge) {
      const log = this.rewardAuditLogRepository.create({
        userId,
        rewardType: RewardType.BADGE,
        amount: 1,
        source,
        sourceId,
        metadata: payload.badge,
      });
      auditLogs.push(await this.rewardAuditLogRepository.save(log));
    }

    this.logger.log(
      `Distributed ${auditLogs.length} rewards to user ${userId} from ${source}`,
    );

    // Broadcast WebSocket event
    if (this.eventsGateway?.server) {
      this.eventsGateway.server.emit('reward_claimed', {
        userId,
        payload,
        source,
        sourceId,
        timestamp: new Date().toISOString(),
      });
    }

    return auditLogs;
  }
}
