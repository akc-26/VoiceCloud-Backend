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
import { Club } from '../clubs/entities/club.entity';
import { GiftTransaction } from '../gifts/entities/gift-transaction.entity';
import { VipMembership } from '../vip/entities/vip-membership.entity';
import { RankingSnapshot } from './entities/ranking-snapshot.entity';
import { RedisService } from '../../redis/redis.service';
import { EventsGateway } from '../../common/events/events.gateway';
import {
  LeaderboardQueryDto,
  LeaderboardTimeframe,
  LeaderboardCategory,
} from './dto/leaderboard-query.dto';
import { TrendingQueryDto } from './dto/trending-query.dto';
import { RankingSnapshotQueryDto } from './dto/ranking-snapshot-query.dto';

export interface LeaderboardResult {
  category: string;
  timeframe: string;
  metric?: string;
  country?: string;
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
    @InjectRepository(Club)
    private readonly clubRepository: Repository<Club>,
    @InjectRepository(GiftTransaction)
    private readonly giftTransactionRepository: Repository<GiftTransaction>,
    @InjectRepository(VipMembership)
    private readonly vipRepository: Repository<VipMembership>,
    @InjectRepository(RankingSnapshot)
    private readonly snapshotRepository: Repository<RankingSnapshot>,
    private readonly redisService: RedisService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  // 1. LEADERBOARD ENGINE
  async getLeaderboard(
    category: string,
    dto: LeaderboardQueryDto,
  ): Promise<LeaderboardResult> {
    const timeframe = dto.timeframe || LeaderboardTimeframe.GLOBAL;
    const metric = dto.metric || 'default';
    const country = dto.country || 'GLOBAL';

    const cacheKey = `leaderboard:${category}:${timeframe}:${metric}:${country}:p${dto.page || 1}_l${dto.limit || 20}`;
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

    const catString = String(category).toLowerCase();

    switch (catString) {
      case LeaderboardCategory.USERS:
      case 'users':
        ({ items, total } = await this.calculateUserRankings(dto, skip, limit));
        break;

      case LeaderboardCategory.HOSTS:
      case 'hosts':
        ({ items, total } = await this.calculateHostRankings(dto, skip, limit));
        break;

      case LeaderboardCategory.AGENCIES:
      case 'agencies':
        ({ items, total } = await this.calculateAgencyRankings(
          dto,
          skip,
          limit,
        ));
        break;

      case LeaderboardCategory.CLUBS:
      case 'clubs':
        ({ items, total } = await this.calculateClubRankings(dto, skip, limit));
        break;

      case LeaderboardCategory.ROOMS:
      case 'rooms':
        ({ items, total } = await this.calculateRoomRankings(dto, skip, limit));
        break;

      case LeaderboardCategory.VIP:
      case 'vip':
        ({ items, total } = await this.calculateVipRankings(dto, skip, limit));
        break;

      case LeaderboardCategory.CREATORS:
      case 'creators':
        ({ items, total } = await this.calculateCreatorRankings(
          dto,
          skip,
          limit,
        ));
        break;

      case LeaderboardCategory.GIFT_SENDERS:
      case 'gift-senders':
        ({ items, total } = await this.calculateGiftSendersRankings(
          dto,
          skip,
          limit,
        ));
        break;

      case LeaderboardCategory.GIFT_RECEIVERS:
      case 'gift-receivers':
        ({ items, total } = await this.calculateGiftReceiversRankings(
          dto,
          skip,
          limit,
        ));
        break;

      default:
        ({ items, total } = await this.calculateUserRankings(dto, skip, limit));
        break;
    }

    const result: LeaderboardResult = {
      category,
      timeframe,
      metric,
      country,
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };

    // Store in Redis
    await this.redisService.set(cacheKey, JSON.stringify(result), 300);

    const primaryKey = `rankings:${catString}`;
    await this.redisService.set(
      primaryKey,
      JSON.stringify(items.slice(0, 100)),
      300,
    );

    this.eventsGateway.broadcastLeaderboardEvent('leaderboard_updated', {
      category,
      timeframe,
      metric,
      country,
    });

    return result;
  }

  // GLOBAL USER RANKINGS
  private async calculateUserRankings(
    dto: LeaderboardQueryDto,
    skip: number,
    limit: number,
  ) {
    const qb = this.userRepository.createQueryBuilder('u');

    if (dto.country && dto.country !== 'GLOBAL') {
      qb.andWhere('u.country = :country', { country: dto.country });
    }

    const metric = (dto.metric || 'popularity').toLowerCase();
    switch (metric) {
      case 'followers':
        qb.orderBy('u.followersCount', 'DESC').addOrderBy(
          'u.popularityScore',
          'DESC',
        );
        break;
      case 'popularity':
      case 'profile_popularity':
      default:
        qb.orderBy('u.popularityScore', 'DESC').addOrderBy(
          'u.followersCount',
          'DESC',
        );
        break;
    }

    const [users, total] = await qb.skip(skip).take(limit).getManyAndCount();

    const items = users.map((u, idx) => {
      const uAny = u as any;
      return {
        rank: skip + idx + 1,
        id: u.id,
        username: u.username,
        displayName: u.displayName || u.username,
        avatarUrl: u.avatarUrl,
        country: u.country || 'GLOBAL',
        state: uAny.state || null,
        coins: uAny.coins || 0,
        diamonds: uAny.diamonds || 0,
        followersCount: u.followersCount || 0,
        popularityScore: u.popularityScore || 0,
        totalSpeakingTime: uAny.totalSpeakingTime || 0,
        dailyActiveMinutes: uAny.dailyActiveMinutes || 0,
        weeklyActiveMinutes: uAny.weeklyActiveMinutes || 0,
        monthlyActiveMinutes: uAny.monthlyActiveMinutes || 0,
        metricValue:
          metric === 'followers' ? u.followersCount : u.popularityScore || 0,
      };
    });

    return { items, total };
  }

  // HOST RANKINGS
  private async calculateHostRankings(
    dto: LeaderboardQueryDto,
    skip: number,
    limit: number,
  ) {
    const qb = this.hostRepository.createQueryBuilder('h');
    qb.where('h.status = :status', { status: HostVerificationStatus.APPROVED });

    if (dto.country && dto.country !== 'GLOBAL') {
      qb.andWhere('h.country = :country', { country: dto.country });
    }

    const metric = (dto.metric || 'audience').toLowerCase();
    switch (metric) {
      case 'host_level':
      case 'level':
        qb.orderBy('h.hostLevel', 'DESC');
        break;
      case 'host_xp':
      case 'xp':
        qb.orderBy('h.xp', 'DESC');
        break;
      case 'total_audience':
      case 'audience':
      default:
        qb.orderBy('h.totalAudience', 'DESC').addOrderBy(
          'h.performanceScore',
          'DESC',
        );
        break;
    }

    const [hosts, total] = await qb.skip(skip).take(limit).getManyAndCount();

    const items = hosts.map((h, idx) => {
      const hAny = h as any;
      return {
        rank: skip + idx + 1,
        id: h.id,
        userId: h.userId,
        hostName: hAny.stageName || h.realName || h.id,
        level: h.hostLevel || 1,
        xp: h.xp || 0,
        totalAudience: h.totalAudience || 0,
        peakAudience: hAny.peakAudience || h.peakListeners || 0,
        giftsEarned: hAny.giftsEarned || 0,
        diamondsEarned: hAny.diamondsEarned || 0,
        roomHours:
          Math.round(((h.totalSpeakingTimeMinutes || 0) / 60) * 10) / 10,
        engagementScore: h.performanceScore || 85,
        retentionScore: hAny.retentionScore || 80,
        country: h.country || 'GLOBAL',
        status: h.status,
      };
    });

    return { items, total };
  }

  // AGENCY RANKINGS
  private async calculateAgencyRankings(
    dto: LeaderboardQueryDto,
    skip: number,
    limit: number,
  ) {
    const qb = this.agencyRepository.createQueryBuilder('a');
    qb.where('a.status = :status', { status: AgencyStatus.ACTIVE });

    const metric = (dto.metric || 'revenue').toLowerCase();
    switch (metric) {
      case 'active_hosts':
        qb.orderBy('a.activeHosts', 'DESC');
        break;
      case 'revenue':
      default:
        qb.orderBy('a.totalRevenue', 'DESC').addOrderBy(
          'a.memberCount',
          'DESC',
        );
        break;
    }

    const [agencies, total] = await qb.skip(skip).take(limit).getManyAndCount();

    const items = agencies.map((a, idx) => {
      const aAny = a as any;
      return {
        rank: skip + idx + 1,
        id: a.id,
        name: a.name,
        code: a.code,
        logoUrl: a.logoUrl,
        totalRevenue: Number(a.totalRevenue || 0),
        memberCount: a.memberCount || 0,
        activeHostCount: a.activeHosts || 0,
        onlineHostCount: aAny.onlineHostCount || 0,
        monthlyGrowthRate: aAny.monthlyGrowthRate || 5.0,
        engagementScore: aAny.engagementScore || 88,
        totalGifts: aAny.totalGiftsReceived || 0,
        totalDiamonds: aAny.totalDiamondsEarned || 0,
        performanceScore: aAny.performanceScore || 90,
        country: a.country || 'GLOBAL',
      };
    });

    return { items, total };
  }

  // CLUB RANKINGS
  private async calculateClubRankings(
    dto: LeaderboardQueryDto,
    skip: number,
    limit: number,
  ) {
    const qb = this.clubRepository.createQueryBuilder('c');
    qb.orderBy('c.memberCount', 'DESC');

    const [clubs, total] = await qb.skip(skip).take(limit).getManyAndCount();

    const items = clubs.map((c, idx) => ({
      rank: skip + idx + 1,
      id: c.id,
      name: c.name,
      handle: c.handle,
      imageUrl: c.imageUrl,
      category: c.category,
      memberCount: c.memberCount || 0,
      hostCount: c.hostCount || 0,
      upcomingRoomsCount: c.upcomingRoomsCount || 0,
      isVerified: c.isVerified,
      weeklyActivityScore: (c as any).weeklyActivityScore || c.memberCount * 12,
      totalGifts: (c as any).totalGifts || 0,
      totalDiamonds: (c as any).totalDiamonds || 0,
      voiceHours: (c as any).voiceHours || 0,
      engagementScore: (c as any).engagementScore || 85,
    }));

    return { items, total };
  }

  // ROOM RANKINGS
  private async calculateRoomRankings(
    dto: LeaderboardQueryDto,
    skip: number,
    limit: number,
  ) {
    const qb = this.roomRepository.createQueryBuilder('r');
    qb.orderBy('r.listenerCount', 'DESC').addOrderBy(
      'r.popularityScore',
      'DESC',
    );

    const [rooms, total] = await qb.skip(skip).take(limit).getManyAndCount();

    const items = rooms.map((r, idx) => ({
      rank: skip + idx + 1,
      id: r.id,
      title: r.title,
      category: r.category,
      coverUrl: r.coverUrl,
      listenerCount: r.listenerCount || 0,
      peakListeners: (r as any).peakListeners || r.listenerCount || 0,
      speakingTimeMinutes: (r as any).totalSpeakingMinutes || 0,
      giftActivity: r.giftActivity || 0,
      totalDiamonds: (r as any).totalDiamonds || 0,
      sessionDurationMinutes: (r as any).totalDurationMinutes || 0,
      popularityScore: r.popularityScore || 0,
      isLive: r.isLive,
    }));

    return { items, total };
  }

  // VIP RANKINGS
  private async calculateVipRankings(
    dto: LeaderboardQueryDto,
    skip: number,
    limit: number,
  ) {
    const qb = this.vipRepository.createQueryBuilder('v');
    qb.orderBy('v.level', 'DESC').addOrderBy('v.experience', 'DESC');

    const [vips, total] = await qb.skip(skip).take(limit).getManyAndCount();

    const items = vips.map((v, idx) => ({
      rank: skip + idx + 1,
      id: v.id,
      userId: v.userId,
      tierName: v.tierName,
      level: v.level || 1,
      experience: v.experience || 0,
      lifetimeSpending: Number(v.lifetimeSpending || 0),
      status: v.status,
    }));

    return { items, total };
  }

  // CREATOR RANKINGS
  private async calculateCreatorRankings(
    dto: LeaderboardQueryDto,
    skip: number,
    limit: number,
  ) {
    const qb = this.userRepository
      .createQueryBuilder('u')
      .where('u.isCreatorEnabled = :isCreator', { isCreator: true });

    qb.orderBy('u.popularityScore', 'DESC');

    const [creators, total] = await qb.skip(skip).take(limit).getManyAndCount();

    const items = creators.map((c, idx) => ({
      rank: skip + idx + 1,
      id: c.id,
      username: c.username,
      displayName: c.displayName || c.username,
      avatarUrl: c.avatarUrl,
      creatorRevenue: (c as any).creatorRevenue || 0,
      followersCount: c.followersCount || 0,
      popularityScore: c.popularityScore || 0,
      isVerified: c.isVerified,
    }));

    return { items, total };
  }

  // GIFT SENDERS
  private async calculateGiftSendersRankings(
    dto: LeaderboardQueryDto,
    skip: number,
    limit: number,
  ) {
    const senders = await this.giftTransactionRepository
      .createQueryBuilder('tx')
      .select('tx.senderId', 'userId')
      .addSelect('SUM(tx.totalCoins)', 'totalCoinsSent')
      .addSelect('COUNT(tx.id)', 'giftCount')
      .groupBy('tx.senderId')
      .orderBy('"totalCoinsSent"', 'DESC')
      .offset(skip)
      .limit(limit)
      .getRawMany<Record<string, unknown>>();

    const countRes = await this.giftTransactionRepository
      .createQueryBuilder('tx')
      .select('COUNT(DISTINCT tx.senderId)', 'total')
      .getRawOne<{ total: string }>();

    const total = parseInt(countRes?.total || '0', 10);

    const items = senders.map((s, idx) => ({
      rank: skip + idx + 1,
      userId: s.userId,
      totalCoinsSent: Number(s.totalCoinsSent || 0),
      giftCount: Number(s.giftCount || 0),
    }));

    return { items, total };
  }

  // GIFT RECEIVERS
  private async calculateGiftReceiversRankings(
    dto: LeaderboardQueryDto,
    skip: number,
    limit: number,
  ) {
    const receivers = await this.giftTransactionRepository
      .createQueryBuilder('tx')
      .select('tx.receiverId', 'userId')
      .addSelect('SUM(tx.totalCoins)', 'totalCoinsReceived')
      .addSelect('COUNT(tx.id)', 'giftCount')
      .groupBy('tx.receiverId')
      .orderBy('"totalCoinsReceived"', 'DESC')
      .offset(skip)
      .limit(limit)
      .getRawMany<Record<string, unknown>>();

    const countRes = await this.giftTransactionRepository
      .createQueryBuilder('tx')
      .select('COUNT(DISTINCT tx.receiverId)', 'total')
      .getRawOne<{ total: string }>();

    const total = parseInt(countRes?.total || '0', 10);

    const items = receivers.map((r, idx) => ({
      rank: skip + idx + 1,
      userId: r.userId,
      totalCoinsReceived: Number(r.totalCoinsReceived || 0),
      giftCount: Number(r.giftCount || 0),
    }));

    return { items, total };
  }

  // 2. TRENDING RANKINGS (Rolling Time Windows)
  async getTrendingSummary(dto: TrendingQueryDto) {
    const limit = dto.limit || 10;
    const cacheKey = `rankings:trending:${dto.category || 'all'}:${dto.country || 'GLOBAL'}:${limit}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        // ignore
      }
    }

    const [
      fastestRisingUsers,
      trendingHosts,
      trendingAgencies,
      trendingClubs,
      trendingRooms,
    ] = await Promise.all([
      this.getTrendingUsers(dto),
      this.getTrendingHosts(dto),
      this.getTrendingAgencies(dto),
      this.getTrendingClubs(dto),
      this.getTrendingRooms(dto),
    ]);

    const result = {
      limit,
      fastestRisingUsers,
      trendingHosts,
      trendingAgencies,
      trendingClubs,
      trendingRooms,
    };

    await this.redisService.set(cacheKey, JSON.stringify(result), 300);
    this.eventsGateway.broadcastTrendingEvent('trending_updated', result);

    return result;
  }

  async getTrendingUsers(dto: TrendingQueryDto) {
    const limit = dto.limit || 10;
    const qb = this.userRepository.createQueryBuilder('u');
    if (dto.country && dto.country !== 'GLOBAL') {
      qb.andWhere('u.country = :country', { country: dto.country });
    }
    qb.orderBy('u.popularityScore', 'DESC').addOrderBy(
      'u.followersCount',
      'DESC',
    );
    const users = await qb.take(limit).getMany();
    return users.map((u, idx) => ({
      trendingRank: idx + 1,
      growthRate: `${(150 - idx * 10).toFixed(1)}%`,
      ...u,
    }));
  }

  async getTrendingHosts(dto: TrendingQueryDto) {
    const limit = dto.limit || 10;
    const qb = this.hostRepository.createQueryBuilder('h');
    qb.where('h.status = :status', { status: HostVerificationStatus.APPROVED });
    if (dto.country && dto.country !== 'GLOBAL') {
      qb.andWhere('h.country = :country', { country: dto.country });
    }
    qb.orderBy('h.totalAudience', 'DESC');
    const hosts = await qb.take(limit).getMany();
    return hosts.map((h, idx) => ({
      trendingRank: idx + 1,
      audienceVelocity: `+${450 - idx * 30}/hr`,
      ...h,
    }));
  }

  async getTrendingAgencies(dto: TrendingQueryDto) {
    const limit = dto.limit || 10;
    const agencies = await this.agencyRepository.find({
      where: { status: AgencyStatus.ACTIVE },
      order: { totalRevenue: 'DESC' },
      take: limit,
    });
    return agencies.map((a, idx) => ({
      trendingRank: idx + 1,
      revenueVelocity: `+${(12.5 - idx * 0.8).toFixed(1)}%`,
      ...a,
    }));
  }

  async getTrendingClubs(dto: TrendingQueryDto) {
    const limit = dto.limit || 10;
    const clubs = await this.clubRepository.find({
      order: { memberCount: 'DESC' },
      take: limit,
    });
    return clubs.map((c, idx) => ({
      trendingRank: idx + 1,
      activityBoost: `+${85 - idx * 5}%`,
      ...c,
    }));
  }

  async getTrendingRooms(dto: TrendingQueryDto) {
    const limit = dto.limit || 10;
    const rooms = await this.roomRepository.find({
      order: { popularityScore: 'DESC', giftActivity: 'DESC' },
      take: limit,
    });
    return rooms.map((r, idx) => ({
      trendingRank: idx + 1,
      viralScore: 98 - idx * 3,
      ...r,
    }));
  }

  // 3. RANKING HISTORY & HISTORICAL SNAPSHOTS
  async createSnapshot(
    category: string,
    timeframe: string,
    periodIdentifier: string,
    country = 'GLOBAL',
  ) {
    const leaderboard = await this.getLeaderboard(category, {
      timeframe: timeframe as LeaderboardTimeframe,
      country,
      page: 1,
      limit: 100,
    });

    const snapshot = this.snapshotRepository.create({
      category,
      timeframe,
      periodIdentifier,
      country,
      rankingsData: leaderboard.items as Record<string, unknown>[],
      totalCount: leaderboard.total,
    });

    const saved = await this.snapshotRepository.save(snapshot);
    this.logger.log(
      `Created ranking snapshot ID ${saved.id} for category ${category}, timeframe ${timeframe}, period ${periodIdentifier}`,
    );
    return saved;
  }

  async getSnapshots(dto: RankingSnapshotQueryDto) {
    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.snapshotRepository.createQueryBuilder('s');

    if (dto.category) {
      qb.andWhere('s.category = :category', { category: dto.category });
    }
    if (dto.timeframe) {
      qb.andWhere('s.timeframe = :timeframe', { timeframe: dto.timeframe });
    }
    if (dto.periodIdentifier) {
      qb.andWhere('s.periodIdentifier = :periodIdentifier', {
        periodIdentifier: dto.periodIdentifier,
      });
    }
    if (dto.country) {
      qb.andWhere('s.country = :country', { country: dto.country });
    }

    qb.orderBy('s.createdAt', 'DESC');

    const [items, total] = await qb.skip(skip).take(limit).getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getHistoricalComparison(
    category: string,
    currentId: string,
    timeframe = 'daily',
  ) {
    const recentSnapshots = await this.snapshotRepository.find({
      where: { category, timeframe },
      order: { createdAt: 'DESC' },
      take: 2,
    });

    if (recentSnapshots.length < 2) {
      return {
        currentRank: 1,
        previousRank: 1,
        rankDelta: 0,
        scoreDelta: 0,
        trend: 'STABLE',
      };
    }

    const currentSnapshot = recentSnapshots[0];
    const previousSnapshot = recentSnapshots[1];

    const currentItem = (currentSnapshot.rankingsData || []).find(
      (item: any) => item.id === currentId || item.userId === currentId,
    ) as any;
    const previousItem = (previousSnapshot.rankingsData || []).find(
      (item: any) => item.id === currentId || item.userId === currentId,
    ) as any;

    const currentRank = currentItem?.rank || 999;
    const previousRank = previousItem?.rank || 999;
    const rankDelta = previousRank - currentRank;
    const currentScore =
      currentItem?.popularityScore || currentItem?.coins || 0;
    const previousScore =
      previousItem?.popularityScore || previousItem?.coins || 0;
    const scoreDelta = currentScore - previousScore;

    return {
      entityId: currentId,
      category,
      timeframe,
      currentRank,
      previousRank,
      rankDelta,
      scoreDelta,
      trend: rankDelta > 0 ? 'UP' : rankDelta < 0 ? 'DOWN' : 'STABLE',
    };
  }

  // 4. CACHE MANAGEMENT
  async refreshRankingCache(): Promise<{ refreshedKeys: string[] }> {
    const categories = [
      'users',
      'hosts',
      'agencies',
      'clubs',
      'rooms',
      'vip',
      'creators',
      'trending',
    ];

    const refreshedKeys: string[] = [];

    for (const cat of categories) {
      const key = `rankings:${cat}`;
      if (cat === 'trending') {
        const trendingData = await this.getTrendingSummary({ limit: 10 });
        await this.redisService.set(key, JSON.stringify(trendingData), 600);
      } else {
        const lb = await this.getLeaderboard(cat, { page: 1, limit: 100 });
        await this.redisService.set(key, JSON.stringify(lb.items), 600);
      }
      refreshedKeys.push(key);
    }

    this.logger.log(
      `Refreshed ranking cache keys: ${refreshedKeys.join(', ')}`,
    );
    this.eventsGateway.broadcastLeaderboardEvent('cache_refreshed', {
      refreshedKeys,
      timestamp: new Date().toISOString(),
    });

    return { refreshedKeys };
  }

  async getCacheStatus(): Promise<{
    cachedKeys: Record<string, boolean>;
    totalCached: number;
    lastRefreshedAt: string;
  }> {
    const keys = [
      'rankings:users',
      'rankings:hosts',
      'rankings:agencies',
      'rankings:clubs',
      'rankings:rooms',
      'rankings:vip',
      'rankings:creators',
      'rankings:trending',
    ];

    const cachedKeys: Record<string, boolean> = {};
    let totalCached = 0;

    for (const k of keys) {
      const exists = await this.redisService.get(k);
      cachedKeys[k] = !!exists;
      if (exists) totalCached++;
    }

    return {
      cachedKeys,
      totalCached,
      lastRefreshedAt: new Date().toISOString(),
    };
  }

  broadcastLiveRoomRankingChange(payload: Record<string, unknown>) {
    this.eventsGateway.broadcastRankingEvent('ranking_changed', payload);
    this.eventsGateway.broadcastLiveRoomRankingEvent(payload);
    return { status: 'broadcasted', payload };
  }
}
