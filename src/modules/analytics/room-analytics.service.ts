import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, MoreThanOrEqual } from 'typeorm';
import { Room } from '../rooms/entities/room.entity';
import { RedisService } from '../../redis/redis.service';
import {
  RoomAnalyticsQueryDto,
  AnalyticsTimeframe,
} from './dto/room-analytics-query.dto';

@Injectable()
export class RoomAnalyticsService {
  constructor(
    @InjectRepository(Room)
    private readonly roomRepository: Repository<Room>,
    private readonly redisService: RedisService,
  ) {}

  private async requireRoom(roomId: string): Promise<Room> {
    const room = await this.roomRepository.findOne({ where: { id: roomId } });
    if (!room) throw new NotFoundException(`Room with ID ${roomId} not found`);
    return room;
  }

  private async redisNumber(key: string): Promise<number | null> {
    const raw = await this.redisService.get(key);
    if (raw === null || raw === undefined || raw === '') return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private calculateRoomDurationSeconds(room: Room): number {
    if (!room.startedAt) return 0;
    const end = room.endedAt ? new Date(room.endedAt) : room.isLive ? new Date() : null;
    if (!end) return 0;
    return Math.max(0, Math.floor((end.getTime() - new Date(room.startedAt).getTime()) / 1000));
  }

  async getRealtimeRoomAnalytics(roomId: string, query: RoomAnalyticsQueryDto) {
    const room = await this.requireRoom(roomId);
    const peakViewers = await this.redisNumber(`room:${roomId}:peak_viewers`);
    const totalAudioSeconds = await this.redisNumber(`room:${roomId}:audio_duration`);
    const giftsTotalCoins = await this.redisNumber(`room:${roomId}:total_gifts_coins`);
    const chatCount = await this.redisNumber(`room:${roomId}:chat_count`);

    const currentListeners = room.listenerCount || 0;
    const peakListeners = Math.max(currentListeners, peakViewers ?? currentListeners);
    const audioDurationSeconds = totalAudioSeconds ?? this.calculateRoomDurationSeconds(room);
    const giftsCoins = giftsTotalCoins ?? Number(room.giftActivity || 0);
    const totalChatMessages = chatCount ?? 0;
    const rawScore = currentListeners * 2 + giftsCoins / 10 + totalChatMessages * 1.5;

    return {
      roomId,
      title: room.title,
      isLive: room.isLive,
      category: room.category,
      timeframe: query.timeframe || AnalyticsTimeframe.REALTIME,
      metrics: {
        currentListeners,
        peakListeners,
        speakerCount: room.speakerCount || 0,
        audioDurationSeconds,
        audioDurationFormatted: `${Math.floor(audioDurationSeconds / 3600)}h ${Math.floor((audioDurationSeconds % 3600) / 60)}m`,
        totalChatMessages,
        giftsTotalCoins: giftsCoins,
        popularityScore: room.popularityScore || 0,
        engagementScore: Math.min(100, Math.round(rawScore)),
      },
      // A retention curve must come from captured join/leave samples. Returning an
      // empty series is intentional when no authoritative samples have been persisted.
      listenerRetentionCurve: [],
      dataCompleteness: {
        retentionCurve: false,
        peakListeners: peakViewers !== null,
        chatMessages: chatCount !== null,
        audioDuration: totalAudioSeconds !== null || !!room.startedAt,
        gifts: giftsTotalCoins !== null || Number(room.giftActivity || 0) > 0,
      },
      timestamp: new Date().toISOString(),
    };
  }

  async getSessionSummaryReport(roomId: string) {
    const room = await this.requireRoom(roomId);
    const peak = await this.redisNumber(`room:${roomId}:peak_viewers`);
    return {
      roomId,
      title: room.title,
      hostId: room.hostId,
      createdAt: room.createdAt,
      summary: {
        totalUniqueVisitors: room.listenerCount || 0,
        peakConcurrentViewers: Math.max(room.listenerCount || 0, peak ?? 0),
        totalGiftsEarnedCoins: Number(room.giftActivity || 0),
        topGiftItem: null,
        avgListenTimeMinutes: null,
        newFollowsGenerated: null,
      },
      dataCompleteness: {
        uniqueVisitors: false,
        topGiftItem: false,
        averageListenTime: false,
        newFollows: false,
      },
    };
  }

  async getAudienceGrowth(roomId: string) {
    const room = await this.requireRoom(roomId);
    return {
      roomId,
      title: room.title,
      growthTimeline: [],
      dataAvailable: false,
      reason: 'Authoritative audience join/leave time-series samples have not been persisted for this room',
    };
  }

  async getListenerRetention(roomId: string) {
    const room = await this.requireRoom(roomId);
    return {
      roomId,
      title: room.title,
      peakListeners: room.listenerCount || 0,
      retentionData: [],
      dataAvailable: false,
      reason: 'Authoritative listener retention samples have not been persisted for this room',
    };
  }

  async getSpeakerActivity(roomId: string) {
    const room = await this.requireRoom(roomId);
    return {
      roomId,
      hostId: room.hostId,
      speakerCount: room.speakerCount || 0,
      speakers: [],
      dataAvailable: false,
      reason: 'Detailed speaker talk-time analytics are available only when RTC speaker-history aggregation has been persisted',
    };
  }

  async getGiftingHeatmap(roomId: string) {
    const room = await this.requireRoom(roomId);
    return {
      roomId,
      totalGiftsCoins: Number(room.giftActivity || 0),
      hourlyHeatmap: [],
      dataAvailable: false,
      reason: 'Hourly gift-event aggregation has not been persisted for this room',
    };
  }

  async getHourlyEngagement(roomId: string) {
    await this.requireRoom(roomId);
    return {
      roomId,
      hourlyMetrics: [],
      dataAvailable: false,
      reason: 'Hourly engagement-event aggregation has not been persisted for this room',
    };
  }

  async compareSessions(roomIds: string[]) {
    const rooms = await this.roomRepository.findBy({ id: In(roomIds) });
    if (!rooms.length) throw new NotFoundException('No matching rooms found for comparison');
    return {
      totalSessionsCompared: rooms.length,
      comparison: rooms.map((r) => ({
        roomId: r.id,
        title: r.title,
        category: r.category,
        peakListeners: r.listenerCount || 0,
        giftActivityCoins: Number(r.giftActivity || 0),
        popularityScore: r.popularityScore || 0,
        createdAt: r.createdAt,
      })),
    };
  }

  async getCreatorAnalyticsOverview(
    period: '24h' | '7d' | '30d' | '1y' = '30d',
    userId?: string,
  ) {
    if (!userId) {
      return this.emptyCreatorOverview(period, 'Creator identity is unavailable');
    }

    const days = period === '24h' ? 1 : period === '7d' ? 7 : period === '1y' ? 365 : 30;
    const since = new Date();
    since.setDate(since.getDate() - days);
    const rooms = await this.roomRepository.find({
      where: { hostId: userId, createdAt: MoreThanOrEqual(since) },
      order: { createdAt: 'ASC' },
    });

    const totalListenHours = rooms.reduce(
      (sum, room) => sum + this.calculateRoomDurationSeconds(room) / 3600,
      0,
    );
    const peakConcurrentListeners = rooms.reduce(
      (max, room) => Math.max(max, room.listenerCount || 0),
      0,
    );
    const totalGiftsReceived = rooms.reduce(
      (sum, room) => sum + Number(room.giftActivity || 0),
      0,
    );

    // Revenue, follower acquisition, and listener-retention values are not
    // derivable from Room rows alone. Do not manufacture them. The empty daily
    // series causes Creator Studio to show its no-data state instead of charts
    // filled with synthetic numbers.
    return {
      period,
      totalListenHours: Number(totalListenHours.toFixed(2)),
      peakConcurrentListeners,
      totalGiftsReceived,
      netRevenueUsd: 0,
      listenerRetentionRate: 0,
      dailyMetrics: [],
      dataCompleteness: {
        roomDuration: true,
        peakListeners: true,
        gifts: true,
        revenue: false,
        followerAcquisition: false,
        listenerRetention: false,
      },
    };
  }

  private emptyCreatorOverview(period: '24h' | '7d' | '30d' | '1y', reason: string) {
    return {
      period,
      totalListenHours: 0,
      peakConcurrentListeners: 0,
      totalGiftsReceived: 0,
      netRevenueUsd: 0,
      listenerRetentionRate: 0,
      dailyMetrics: [],
      dataCompleteness: {
        roomDuration: false,
        peakListeners: false,
        gifts: false,
        revenue: false,
        followerAcquisition: false,
        listenerRetention: false,
      },
      reason,
    };
  }
}
