import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, Optional, Inject, forwardRef } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES, JOB_TYPES } from '../queue.constants';
import { RankingsService } from '../../modules/rankings/rankings.service';

@Processor(QUEUE_NAMES.LEADERBOARD_CALCULATION)
export class LeaderboardCalculationProcessor extends WorkerHost {
  private readonly logger = new Logger(LeaderboardCalculationProcessor.name);

  constructor(
    @Optional()
    @Inject(forwardRef(() => RankingsService))
    private readonly rankingsService?: RankingsService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(
      `Processing leaderboard calculation job ${job.id} - ${job.name}`,
    );

    switch (job.name) {
      case JOB_TYPES.RANKINGS.RANKING_CALCULATION:
      case 'calculate-rankings': {
        const category = job.data?.category || 'users';
        if (this.rankingsService) {
          await this.rankingsService.getLeaderboard(category, job.data || {});
        }
        return {
          status: 'completed',
          jobId: job.id,
          task: 'ranking-calculation',
          category,
          processedAt: new Date().toISOString(),
        };
      }

      case JOB_TYPES.RANKINGS.TRENDING_CALCULATION:
      case 'calculate-trending': {
        if (this.rankingsService) {
          await this.rankingsService.getTrendingSummary(job.data || {});
        }
        return {
          status: 'completed',
          jobId: job.id,
          task: 'trending-calculation',
          processedAt: new Date().toISOString(),
        };
      }

      case JOB_TYPES.RANKINGS.HISTORICAL_SNAPSHOT:
      case 'create-historical-snapshot': {
        const category = job.data?.category || 'users';
        const timeframe = job.data?.timeframe || 'daily';
        const periodIdentifier =
          job.data?.periodIdentifier || new Date().toISOString().split('T')[0];
        if (this.rankingsService) {
          await this.rankingsService.createSnapshot(
            category,
            timeframe,
            periodIdentifier,
            job.data?.country || 'GLOBAL',
          );
        }
        return {
          status: 'completed',
          jobId: job.id,
          task: 'historical-snapshot',
          category,
          timeframe,
          periodIdentifier,
          processedAt: new Date().toISOString(),
        };
      }

      case JOB_TYPES.RANKINGS.CACHE_REFRESH:
      case 'refresh-ranking-cache': {
        if (this.rankingsService) {
          await this.rankingsService.refreshRankingCache();
        }
        return {
          status: 'completed',
          jobId: job.id,
          task: 'cache-refresh',
          processedAt: new Date().toISOString(),
        };
      }

      case JOB_TYPES.RANKINGS.LEADERBOARD_AGGREGATION:
      case 'aggregate-leaderboards': {
        if (this.rankingsService) {
          await this.rankingsService.refreshRankingCache();
        }
        return {
          status: 'completed',
          jobId: job.id,
          task: 'leaderboard-aggregation',
          processedAt: new Date().toISOString(),
        };
      }

      default:
        return {
          status: 'completed',
          jobId: job.id,
          name: job.name,
          recalculatedAt: new Date().toISOString(),
        };
    }
  }
}
