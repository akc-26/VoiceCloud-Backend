import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { RedisService } from '../../redis/redis.service';
import { PollStatus } from '../polls/entities/poll.entity';
import { QuizStatus } from '../quizzes/entities/quiz.entity';

@Injectable()
export class AdminDashboardService {
  private readonly logger = new Logger(AdminDashboardService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly redisService: RedisService,
  ) {}

  async getDashboardStats() {
    this.logger.debug('Generating admin system dashboard stats');

    let totalUsers = 0;
    let activeTodayUsers = 0;
    let totalRooms = 0;
    let liveRooms = 0;
    let totalWalletTx = 0;
    let totalGifts = 0;
    let totalVips = 0;
    let totalHosts = 0;
    let totalNotifications = 0;
    let activePolls = 0;
    let totalPollVotes = 0;
    let activeQuizzes = 0;
    let totalQuizParticipants = 0;
    let activeRegionalCountries = 0;

    try {
      if (this.dataSource.hasMetadata('User')) {
        const userRepo = this.dataSource.getRepository('User');
        totalUsers = await userRepo.count();
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        activeTodayUsers = await userRepo
          .createQueryBuilder('u')
          .where('u.lastActiveAt >= :startOfToday', { startOfToday })
          .getCount();
      }
      if (this.dataSource.hasMetadata('Room')) {
        totalRooms = await this.dataSource.getRepository('Room').count();
        liveRooms = await this.dataSource
          .getRepository('Room')
          .count({ where: { isLive: true } });
      }
      if (this.dataSource.hasMetadata('WalletTransaction')) {
        totalWalletTx = await this.dataSource
          .getRepository('WalletTransaction')
          .count();
      }
      if (this.dataSource.hasMetadata('Gift')) {
        totalGifts = await this.dataSource.getRepository('Gift').count();
      }
      if (this.dataSource.hasMetadata('VipMembership')) {
        totalVips = await this.dataSource
          .getRepository('VipMembership')
          .count();
      }
      if (this.dataSource.hasMetadata('HostProfile')) {
        totalHosts = await this.dataSource.getRepository('HostProfile').count();
      }
      if (this.dataSource.hasMetadata('Notification')) {
        totalNotifications = await this.dataSource
          .getRepository('Notification')
          .count();
      }
      if (this.dataSource.hasMetadata('Poll')) {
        activePolls = await this.dataSource
          .getRepository('Poll')
          .count({ where: { status: PollStatus.ACTIVE } });
      }
      if (this.dataSource.hasMetadata('PollVote')) {
        totalPollVotes = await this.dataSource
          .getRepository('PollVote')
          .count();
      }
      if (this.dataSource.hasMetadata('Quiz')) {
        activeQuizzes = await this.dataSource
          .getRepository('Quiz')
          .count({ where: { status: QuizStatus.ACTIVE } });
      }
      if (this.dataSource.hasMetadata('QuizParticipantScore')) {
        totalQuizParticipants = await this.dataSource
          .getRepository('QuizParticipantScore')
          .count();
      }
      if (this.dataSource.hasMetadata('RegionalPricingConfig')) {
        activeRegionalCountries = await this.dataSource
          .getRepository('RegionalPricingConfig')
          .count({ where: { isActive: true } });
      }
    } catch (err: any) {
      this.logger.error(
        `Error in AdminDashboardService.getDashboardStats() while querying counts: ${err?.message || err}`,
        err?.stack,
      );
    }

    let activeRtcSessions = liveRooms;
    let averageRtcQualityScore: number | null = null;
    let storageProvider: string | null = null;

    try {
      if (this.dataSource.hasMetadata('RtcSession')) {
        activeRtcSessions = await this.dataSource
          .getRepository('RtcSession')
          .count({ where: { status: 'active' } });
      }
      if (this.dataSource.hasMetadata('RtcAnalytics')) {
        const quality = await this.dataSource
          .getRepository('RtcAnalytics')
          .createQueryBuilder('a')
          .select('AVG(a.networkQualityScore)', 'average')
          .getRawOne<{ average: string | null }>();
        averageRtcQualityScore = quality?.average === null || quality?.average === undefined
          ? null
          : Number(Number(quality.average).toFixed(2));
      }
      if (this.dataSource.hasMetadata('ProviderConfig')) {
        const provider = await this.dataSource
          .getRepository('ProviderConfig')
          .findOne({
            where: { category: 'storage', isEnabled: true, isActive: true },
            order: { priority: 'ASC' },
          });
        storageProvider = provider?.name || provider?.providerType || null;
      }
    } catch (err: any) {
      this.logger.warn(
        `Infrastructure dashboard metrics could not be fully resolved: ${err?.message || err}`,
      );
    }

    let redisPing = false;
    try {
      redisPing = await this.redisService.ping();
    } catch (err: any) {
      this.logger.warn(
        `Redis ping failed in AdminDashboardService.getDashboardStats(): ${err?.message || err}`,
      );
    }

    const isDbConnected = this.dataSource.isInitialized;

    return {
      overview: {
        users: { total: totalUsers, activeToday: activeTodayUsers },
        rooms: { total: totalRooms, liveNow: liveRooms },
        wallet: { totalTransactions: totalWalletTx },
        gifts: { catalogSize: totalGifts },
        vip: { totalSubscribers: totalVips },
        hosts: { totalVerified: totalHosts },
        notifications: { totalSent: totalNotifications },
        polls: { activeNow: activePolls, totalVotesCast: totalPollVotes },
        quizzes: {
          activeNow: activeQuizzes,
          totalParticipants: totalQuizParticipants,
        },
        pricing: { activeCountries: activeRegionalCountries },
      },
      infrastructure: {
        database: {
          status: isDbConnected ? 'connected' : 'disconnected',
          driver: 'PostgreSQL',
        },
        redis: { status: redisPing ? 'connected' : 'disconnected' },
        rtcSessions: {
          active: activeRtcSessions,
          capacityLimit: null,
          averageQualityScore: averageRtcQualityScore,
        },
        storage: {
          provider: storageProvider,
          usageMb: null,
          usageTracked: false,
        },
      },
      timestamp: new Date().toISOString(),
    };
  }
}
