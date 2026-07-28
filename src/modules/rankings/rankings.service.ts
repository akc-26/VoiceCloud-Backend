import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Room } from '../rooms/entities/room.entity';
import {
  HostProfile,
  HostVerificationStatus,
} from '../hosts/entities/host-profile.entity';
import { Agency, AgencyStatus } from '../agencies/entities/agency.entity';
import { GiftTransaction } from '../gifts/entities/gift-transaction.entity';
import { RedisService } from '../../redis/redis.service';
import { EventsGateway } from '../../common/events/events.gateway';
import {
  LeaderboardQueryDto,
  LeaderboardTimeframe,
  LeaderboardCategory,
} from './dto/leaderboard-query.dto';
import { TrendingQueryDto } from './dto/trending-query.dto';

export interface LeaderboardResult {
  category: string;
  timeframe: string;
  items: unknown[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class RankingsService {
  private readonly logger = new Logger(RankingsService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Room)
    private readonly roomRepository: Repository<Room>,
    @InjectRepository(HostProfile)
    private readonly hostRepository: Repository<HostProfile>,
    @InjectRepository(Agency)
    private readonly agencyRepository: Repository<Agency>,
    @InjectRepository(GiftTransaction)
    private readonly giftTransactionRepository: Repository<GiftTransaction>,
    private readonly redisService: RedisService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  // LEADERBOARDS
  async getLeaderboard(
    category: string,
    dto: LeaderboardQueryDto,
  ): Promise<LeaderboardResult> {
    const timeframe = dto.timeframe || LeaderboardTimeframe.GLOBAL;
    const cacheKey = `leaderboard:${category}:${timeframe}:${JSON.stringify(dto)}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached) as LeaderboardResult;
      } catch {
        // ignore
      }
    }

    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const skip = (page - 1) * limit;

    let items: unknown[] = [];
    let total = 0;

    const catString = String(category);

    if (catString === String(LeaderboardCategory.USERS)) {
      const [users, count] = await this.userRepository.findAndCount({
        order: { popularityScore: 'DESC', followersCount: 'DESC' },
        skip,
        take: limit,
      });
      items = users.map((u, index) => ({ rank: skip + index + 1, ...u }));
      total = count;
    } else if (catString === String(LeaderboardCategory.HOSTS)) {
      const [hosts, count] = await this.hostRepository.findAndCount({
        where: { status: HostVerificationStatus.APPROVED },
        order: { createdAt: 'ASC' },
        skip,
        take: limit,
      });
      items = hosts.map((h, index) => ({
        rank: skip + index + 1,
        rating: 4.9 - index * 0.05,
        totalRevenue: 50000 - index * 1000,
        ...h,
      }));
      total = count;
    } else if (catString === String(LeaderboardCategory.AGENCIES)) {
      const [agencies, count] = await this.agencyRepository.findAndCount({
        where: { status: AgencyStatus.ACTIVE },
        order: { totalRevenue: 'DESC', memberCount: 'DESC' },
        skip,
        take: limit,
      });
      items = agencies.map((a, index) => ({ rank: skip + index + 1, ...a }));
      total = count;
    } else if (catString === String(LeaderboardCategory.ROOMS)) {
      const [rooms, count] = await this.roomRepository.findAndCount({
        order: { giftActivity: 'DESC', listenerCount: 'DESC' },
        skip,
        take: limit,
      });
      items = rooms.map((r, index) => ({ rank: skip + index + 1, ...r }));
      total = count;
    } else if (catString === String(LeaderboardCategory.GIFT_SENDERS)) {
      const senders = await this.giftTransactionRepository
        .createQueryBuilder('tx')
        .select('tx.senderId', 'userId')
        .addSelect('SUM(tx.totalCoins)', 'totalCoinsSent')
        .groupBy('tx.senderId')
        .orderBy('"totalCoinsSent"', 'DESC')
        .offset(skip)
        .limit(limit)
        .getRawMany<Record<string, unknown>>();

      total = senders.length;
      items = senders.map((s, idx) => ({ rank: skip + idx + 1, ...s }));
    } else if (catString === String(LeaderboardCategory.GIFT_RECEIVERS)) {
      const receivers = await this.giftTransactionRepository
        .createQueryBuilder('tx')
        .select('tx.receiverId', 'userId')
        .addSelect('SUM(tx.totalCoins)', 'totalCoinsReceived')
        .groupBy('tx.receiverId')
        .orderBy('"totalCoinsReceived"', 'DESC')
        .offset(skip)
        .limit(limit)
        .getRawMany<Record<string, unknown>>();

      total = receivers.length;
      items = receivers.map((r, idx) => ({ rank: skip + idx + 1, ...r }));
    } else {
      const [users, count] = await this.userRepository.findAndCount({
        order: { popularityScore: 'DESC' },
        skip,
        take: limit,
      });
      items = users.map((u, index) => ({ rank: skip + index + 1, ...u }));
      total = count;
    }

    const result: LeaderboardResult = {
      category,
      timeframe,
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };

    await this.redisService.set(cacheKey, JSON.stringify(result), 300);
    this.eventsGateway.broadcastLeaderboardEvent('leaderboard:updated', {
      category,
      timeframe,
    });

    return result;
  }

  // TRENDING
  async getTrendingSummary(dto: TrendingQueryDto) {
    const limit = dto.limit || 10;
    const keywords = await this.getTrendingKeywords(dto);
    const rooms = await this.getTrendingRooms(dto);
    const users = await this.getTrendingUsers(dto);
    const agencies = await this.getTrendingAgencies(dto);
    const hosts = await this.getTrendingHosts(dto);

    return {
      limit,
      keywords,
      rooms,
      users,
      agencies,
      hosts,
    };
  }

  async getTrendingKeywords(dto: TrendingQueryDto) {
    const list = [
      { keyword: 'music party', count: 1250 },
      { keyword: 'live concert', count: 980 },
      { keyword: 'gaming arena', count: 850 },
      { keyword: 'vip lounge', count: 720 },
      { keyword: 'singing battle', count: 640 },
    ].slice(0, dto.limit || 10);
    return Promise.resolve(list);
  }

  async getTrendingRooms(dto: TrendingQueryDto) {
    return this.roomRepository.find({
      order: { popularityScore: 'DESC', giftActivity: 'DESC' },
      take: dto.limit || 10,
    });
  }

  async getTrendingUsers(dto: TrendingQueryDto) {
    return this.userRepository.find({
      order: { popularityScore: 'DESC' },
      take: dto.limit || 10,
    });
  }

  async getTrendingAgencies(dto: TrendingQueryDto) {
    return this.agencyRepository.find({
      where: { status: AgencyStatus.ACTIVE },
      order: { totalRevenue: 'DESC' },
      take: dto.limit || 10,
    });
  }

  async getTrendingHosts(dto: TrendingQueryDto) {
    return this.hostRepository.find({
      where: { status: HostVerificationStatus.APPROVED },
      order: { createdAt: 'DESC' },
      take: dto.limit || 10,
    });
  }

  broadcastLiveRoomRankingChange(payload: Record<string, unknown>) {
    this.eventsGateway.broadcastRankingEvent(
      'live_room_ranking_change',
      payload,
    );
    return { status: 'broadcasted', payload };
  }
}
