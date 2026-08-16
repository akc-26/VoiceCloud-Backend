import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RtcQualityMetric } from './entities/rtc-quality-metric.entity';
import { ReportRtcMetricsDto } from './dto/report-rtc-metrics.dto';
import { RedisService } from '../../redis/redis.service';

export interface RoomQualitySummary {
  roomId: string;
  totalParticipantsReporting: number;
  averageBitrate: number | null;
  averagePacketLoss: number | null;
  averageJitter: number | null;
  averageRtt: number | null;
  overallConnectionQuality: string;
  overallScore: number | null;
  adaptiveRecommendation: string;
  participantScores: Array<{
    userId: string;
    bitrate: number;
    packetLoss: number;
    jitter: number;
    rtt: number;
    connectionQuality: string;
    networkScore: number;
    recommendation: string;
  }>;
}

@Injectable()
export class RtcQualityService {
  private readonly logger = new Logger(RtcQualityService.name);

  constructor(
    @InjectRepository(RtcQualityMetric)
    private readonly qualityRepository: Repository<RtcQualityMetric>,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Calculates network score (0 - 100), quality rating, and adaptive quality recommendation
   */
  public calculateNetworkScore(
    packetLoss: number,
    jitter: number,
    rtt: number,
  ): { score: number; quality: string; recommendation: string } {
    // Score deduction math
    let score = 100;
    score -= packetLoss * 3.5; // High penalty for packet loss
    score -= Math.min(30, jitter * 0.4); // Penalty for jitter
    score -= Math.min(30, (rtt / 10) * 0.5); // Penalty for RTT

    score = Math.max(0, Math.min(100, Math.round(score)));

    let quality = 'excellent';
    let recommendation = 'maintain';

    if (score >= 85) {
      quality = 'excellent';
      recommendation = 'maintain';
    } else if (score >= 70) {
      quality = 'good';
      recommendation = 'maintain';
    } else if (score >= 50) {
      quality = 'fair';
      recommendation = 'reduce_bitrate_64k';
    } else {
      quality = 'poor';
      if (packetLoss > 10) {
        recommendation = 'enable_fec_and_reduce_bitrate_32k';
      } else {
        recommendation = 'reduce_bitrate_32k';
      }
    }

    return { score, quality, recommendation };
  }

  async reportMetrics(
    userId: string,
    dto: ReportRtcMetricsDto,
  ): Promise<RtcQualityMetric> {
    const { score, quality, recommendation } = this.calculateNetworkScore(
      dto.packetLoss,
      dto.jitter,
      dto.rtt,
    );

    const metric = this.qualityRepository.create({
      roomId: dto.roomId,
      userId,
      sessionId: dto.sessionId,
      bitrate: dto.bitrate,
      packetLoss: dto.packetLoss,
      jitter: dto.jitter,
      rtt: dto.rtt,
      audioLevel: dto.audioLevel || 0,
      providerConnectionState: dto.providerConnectionState || 'connected',
      connectionQuality: quality,
      participantNetworkScore: score,
      adaptiveRecommendation: recommendation,
    });

    const saved = await this.qualityRepository.save(metric);

    // Cache latest status in Redis
    const cacheKey = `rtc_quality:${dto.roomId}:${userId}`;
    await this.redisService.set(
      cacheKey,
      JSON.stringify({
        userId,
        roomId: dto.roomId,
        bitrate: dto.bitrate,
        packetLoss: dto.packetLoss,
        jitter: dto.jitter,
        rtt: dto.rtt,
        quality,
        score,
        recommendation,
        updatedAt: new Date().toISOString(),
      }),
      300, // 5 min TTL
    );

    return saved;
  }

  async getRoomQualityMetrics(roomId: string): Promise<RoomQualitySummary> {
    // Query recent quality metrics (last 15 minutes)
    const recentMetrics = await this.qualityRepository
      .createQueryBuilder('m')
      .where('m.roomId = :roomId', { roomId })
      .orderBy('m.createdAt', 'DESC')
      .limit(100)
      .getMany();

    if (!recentMetrics.length) {
      return {
        roomId,
        totalParticipantsReporting: 0,
        averageBitrate: null,
        averagePacketLoss: null,
        averageJitter: null,
        averageRtt: null,
        overallConnectionQuality: 'no-data',
        overallScore: null,
        adaptiveRecommendation: 'no-data',
        participantScores: [],
      };
    }

    // Group by latest metric per user
    const userMap = new Map<string, RtcQualityMetric>();
    for (const m of recentMetrics) {
      if (!userMap.has(m.userId)) {
        userMap.set(m.userId, m);
      }
    }

    const latestList = Array.from(userMap.values());
    const count = latestList.length;

    const totalBitrate = latestList.reduce((acc, x) => acc + x.bitrate, 0);
    const totalPacketLoss = latestList.reduce(
      (acc, x) => acc + x.packetLoss,
      0,
    );
    const totalJitter = latestList.reduce((acc, x) => acc + x.jitter, 0);
    const totalRtt = latestList.reduce((acc, x) => acc + x.rtt, 0);
    const totalScore = latestList.reduce(
      (acc, x) => acc + x.participantNetworkScore,
      0,
    );

    const avgBitrate = Math.round(totalBitrate / count);
    const avgPacketLoss = Number((totalPacketLoss / count).toFixed(2));
    const avgJitter = Number((totalJitter / count).toFixed(2));
    const avgRtt = Number((totalRtt / count).toFixed(2));
    const avgScore = Math.round(totalScore / count);

    const { quality, recommendation } = this.calculateNetworkScore(
      avgPacketLoss,
      avgJitter,
      avgRtt,
    );

    return {
      roomId,
      totalParticipantsReporting: count,
      averageBitrate: avgBitrate,
      averagePacketLoss: avgPacketLoss,
      averageJitter: avgJitter,
      averageRtt: avgRtt,
      overallConnectionQuality: quality,
      overallScore: avgScore,
      adaptiveRecommendation: recommendation,
      participantScores: latestList.map((x) => ({
        userId: x.userId,
        bitrate: x.bitrate,
        packetLoss: x.packetLoss,
        jitter: x.jitter,
        rtt: x.rtt,
        connectionQuality: x.connectionQuality,
        networkScore: x.participantNetworkScore,
        recommendation: x.adaptiveRecommendation,
      })),
    };
  }

  async getParticipantQuality(roomId: string, userId: string) {
    const metric = await this.qualityRepository.findOne({
      where: { roomId, userId },
      order: { createdAt: 'DESC' },
    });

    if (!metric) {
      throw new NotFoundException(
        `No quality metrics recorded for user ${userId} in room ${roomId}`,
      );
    }

    return metric;
  }
}
