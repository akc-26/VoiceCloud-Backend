import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Room } from '../rooms/entities/room.entity';
import { HostProfile } from '../hosts/entities/host-profile.entity';
import { VipMembership } from '../vip/entities/vip-membership.entity';
import { RecommendationQueryDto } from './dto/recommendation-query.dto';

@Injectable()
export class RecommendationsService {
  private readonly logger = new Logger(RecommendationsService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Room)
    private readonly roomRepository: Repository<Room>,
    @InjectRepository(HostProfile)
    private readonly hostRepository: Repository<HostProfile>,
    @InjectRepository(VipMembership)
    private readonly userVipRepository: Repository<VipMembership>,
  ) {}

  /**
   * Rule-based algorithm to recommend rooms:
   * Factors considered:
   * 1. VIP Membership (VIP users get recommended higher tier rooms)
   * 2. Room Popularity & Live status
   * 3. Listener & Speaker density
   */
  async recommendRooms(userId: string, dto: RecommendationQueryDto) {
    const limit = dto.limit || 10;

    const userVip = await this.userVipRepository.findOne({
      where: { userId },
    });

    const queryBuilder = this.roomRepository.createQueryBuilder('room');
    queryBuilder.where('room.isLive = :isLive', { isLive: true });

    if (userVip) {
      queryBuilder.addSelect(
        `(room.popularityScore * 1.5 + room.giftActivity * 2.0)`,
        'score',
      );
    } else {
      queryBuilder.addSelect(`room.popularityScore`, 'score');
    }

    queryBuilder
      .orderBy('room.popularityScore', 'DESC')
      .addOrderBy('room.listenerCount', 'DESC')
      .take(limit);

    const items = await queryBuilder.getMany();

    return {
      userId,
      recommendationEngine: 'rule-based-v1',
      factorsConsidered: [
        'user_activity',
        'room_popularity',
        'vip_membership',
        'live_participation',
      ],
      items,
    };
  }

  async recommendUsers(userId: string, dto: RecommendationQueryDto) {
    const limit = dto.limit || 10;

    const items = await this.userRepository.find({
      order: { popularityScore: 'DESC', followersCount: 'DESC' },
      take: limit,
    });

    return {
      userId,
      recommendationEngine: 'rule-based-v1',
      factorsConsidered: [
        'shared_interactions',
        'popularity_score',
        'vip_status',
      ],
      items,
    };
  }

  async recommendHosts(userId: string, dto: RecommendationQueryDto) {
    const limit = dto.limit || 10;

    const items = await this.hostRepository.find({
      order: { updatedAt: 'DESC' },
      take: limit,
    });

    return {
      userId,
      recommendationEngine: 'rule-based-v1',
      factorsConsidered: [
        'verified_status',
        'recent_broadcasts',
        'user_activity',
      ],
      items,
    };
  }
}
