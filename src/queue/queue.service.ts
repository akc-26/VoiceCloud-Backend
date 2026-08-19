import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, JobsOptions, Job } from 'bullmq';
import {
  QUEUE_NAMES,
  DEFAULT_JOB_OPTIONS,
  JOB_TYPES,
  QueueNameType,
} from './queue.constants';
import { SendPushJobData } from './processors/notification.processor';
import { RoomReminderJobData } from './processors/reminder.processor';
import { SubscriptionJobData } from './processors/subscription.processor';
import { PayoutJobData } from './processors/payout.processor';
import { RtcCleanupJobData } from './processors/rtc-cleanup.processor';

export interface QueueJobCounts {
  active: number;
  waiting: number;
  completed: number;
  failed: number;
  delayed: number;
}

export interface AllQueuesStats {
  [queueName: string]: QueueJobCounts;
}

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);
  private readonly queueMap: Record<string, Queue>;

  constructor(
    @InjectQueue(QUEUE_NAMES.NOTIFICATION)
    private readonly notificationQueue: Queue,
    @InjectQueue(QUEUE_NAMES.REMINDER) private readonly reminderQueue: Queue,
    @InjectQueue(QUEUE_NAMES.SUBSCRIPTION)
    private readonly subscriptionQueue: Queue,
    @InjectQueue(QUEUE_NAMES.PAYOUT) private readonly payoutQueue: Queue,
    @InjectQueue(QUEUE_NAMES.RTC_CLEANUP)
    private readonly rtcCleanupQueue: Queue,
    @Optional()
    @InjectQueue(QUEUE_NAMES.LEADERBOARD_CALCULATION)
    private readonly leaderboardQueue?: Queue,
    @Optional()
    @InjectQueue(QUEUE_NAMES.CHAT)
    private readonly chatQueue?: Queue,
    @Optional()
    @InjectQueue(QUEUE_NAMES.TASKS)
    private readonly tasksQueue?: Queue,
    @Optional()
    @InjectQueue(QUEUE_NAMES.REFERRAL)
    private readonly referralQueue?: Queue,
  ) {
    this.queueMap = {
      [QUEUE_NAMES.NOTIFICATION]: this.notificationQueue,
      [QUEUE_NAMES.REMINDER]: this.reminderQueue,
      [QUEUE_NAMES.SUBSCRIPTION]: this.subscriptionQueue,
      [QUEUE_NAMES.PAYOUT]: this.payoutQueue,
      [QUEUE_NAMES.RTC_CLEANUP]: this.rtcCleanupQueue,
    };
    if (this.leaderboardQueue) {
      this.queueMap[QUEUE_NAMES.LEADERBOARD_CALCULATION] =
        this.leaderboardQueue;
    }
    if (this.chatQueue) {
      this.queueMap[QUEUE_NAMES.CHAT] = this.chatQueue;
    }
    if (this.tasksQueue) {
      this.queueMap[QUEUE_NAMES.TASKS] = this.tasksQueue;
    }
    if (this.referralQueue) {
      this.queueMap[QUEUE_NAMES.REFERRAL] = this.referralQueue;
    }
  }

  async addReferralJob(
    jobName: string,
    data: any,
    options?: JobsOptions,
  ): Promise<Job<any> | null> {
    if (!this.referralQueue) {
      this.logger.warn(
        `Referral queue is not initialized. Skipping job ${jobName}`,
      );
      return null;
    }
    const jobOpts: JobsOptions = { ...DEFAULT_JOB_OPTIONS, ...options };
    this.logger.log(`Enqueuing referral job "${jobName}"`);
    return this.referralQueue.add(jobName, data, jobOpts);
  }

  async addTasksJob(
    jobName: string,
    data: any,
    options?: JobsOptions,
  ): Promise<Job<any> | null> {
    if (!this.tasksQueue) {
      this.logger.warn(
        `Tasks queue is not initialized. Skipping job ${jobName}`,
      );
      return null;
    }
    const jobOpts: JobsOptions = { ...DEFAULT_JOB_OPTIONS, ...options };
    this.logger.log(`Enqueuing tasks job "${jobName}"`);
    return this.tasksQueue.add(jobName, data, jobOpts);
  }

  async addChatJob(
    jobName: string,
    data: any,
    options?: JobsOptions,
  ): Promise<Job<any> | null> {
    if (!this.chatQueue) {
      this.logger.warn(
        `Chat queue is not initialized. Skipping job ${jobName}`,
      );
      return null;
    }
    const jobOpts: JobsOptions = { ...DEFAULT_JOB_OPTIONS, ...options };
    this.logger.log(`Enqueuing chat job "${jobName}"`);
    return this.chatQueue.add(jobName, data, jobOpts);
  }

  // --- Queue Producers ---

  async addNotificationJob(
    data: SendPushJobData,
    options?: JobsOptions,
  ): Promise<Job<SendPushJobData>> {
    const jobName =
      data.tokens && data.tokens.length > 1
        ? JOB_TYPES.NOTIFICATION.SEND_BATCH
        : JOB_TYPES.NOTIFICATION.SEND_PUSH;
    const stableJobId = data.notificationId
      ? `notification-${data.notificationId}`
      : data.operationKey
        ? `notification-${this.toSafeJobId(data.operationKey)}`
        : undefined;
    const jobOpts: JobsOptions = {
      ...DEFAULT_JOB_OPTIONS,
      ...(stableJobId ? { jobId: stableJobId } : {}),
      ...options,
    };

    this.logger.log(
      `Enqueuing notification job "${jobName}" for user: ${data.userId || 'multi'}`,
    );
    return this.notificationQueue.add(jobName, data, jobOpts);
  }

  async addReminderJob(
    data: RoomReminderJobData,
    options?: JobsOptions,
  ): Promise<Job<RoomReminderJobData>> {
    const jobOpts: JobsOptions = { ...DEFAULT_JOB_OPTIONS, ...options };
    const jobName = data.isCountdown
      ? JOB_TYPES.REMINDER.COUNTDOWN_NOTIFY
      : JOB_TYPES.REMINDER.ROOM_REMINDER;

    this.logger.log(
      `Enqueuing reminder job "${jobName}" for room: ${data.scheduledRoomId}`,
    );
    return this.reminderQueue.add(jobName, data, jobOpts);
  }

  async addSubscriptionJob(
    data: SubscriptionJobData,
    options?: JobsOptions,
  ): Promise<Job<SubscriptionJobData>> {
    const jobOpts: JobsOptions = { ...DEFAULT_JOB_OPTIONS, ...options };
    const jobName =
      data.action === 'expire'
        ? JOB_TYPES.SUBSCRIPTION.EXPIRE_SUBSCRIPTION
        : JOB_TYPES.SUBSCRIPTION.RENEWAL_REMINDER;

    this.logger.log(
      `Enqueuing subscription job "${jobName}" for subId: ${data.subscriptionId}`,
    );
    return this.subscriptionQueue.add(jobName, data, jobOpts);
  }

  async addPayoutJob(
    data: PayoutJobData,
    options?: JobsOptions,
  ): Promise<Job<PayoutJobData>> {
    const jobOpts: JobsOptions = { ...DEFAULT_JOB_OPTIONS, ...options };
    const jobName =
      data.action === 'verify_reservation'
        ? JOB_TYPES.PAYOUT.VERIFY_RESERVATION
        : JOB_TYPES.PAYOUT.PROCESS_PAYOUT;

    this.logger.log(
      `Enqueuing payout job "${jobName}" for payoutRequestId: ${data.payoutRequestId}`,
    );
    return this.payoutQueue.add(jobName, data, jobOpts);
  }

  async addRtcCleanupJob(
    data: RtcCleanupJobData,
    options?: JobsOptions,
  ): Promise<Job<RtcCleanupJobData>> {
    const jobOpts: JobsOptions = { ...DEFAULT_JOB_OPTIONS, ...options };
    let jobName: string = JOB_TYPES.RTC_CLEANUP.CLEANUP_STALE_ROOM;
    if (data.action === 'archive_scheduled_room') {
      jobName = JOB_TYPES.RTC_CLEANUP.ARCHIVE_SCHEDULED_ROOM;
    } else if (data.action === 'cleanup_speaker_queue') {
      jobName = JOB_TYPES.RTC_CLEANUP.CLEANUP_SPEAKER_QUEUE;
    }

    this.logger.log(
      `Enqueuing RTC cleanup job "${jobName}" for room: ${data.roomId || data.scheduledRoomId}`,
    );
    return this.rtcCleanupQueue.add(jobName, data, jobOpts);
  }

  // --- Rankings queue jobs ---
  async addRankingCalculationJob(
    data: any,
    options?: JobsOptions,
  ): Promise<Job<any> | null> {
    if (!this.leaderboardQueue) return null;
    const jobOpts: JobsOptions = { ...DEFAULT_JOB_OPTIONS, ...options };
    const jobName = JOB_TYPES.RANKINGS.RANKING_CALCULATION;
    this.logger.log(`Enqueuing ranking calculation job "${jobName}"`);
    return this.leaderboardQueue.add(jobName, data, jobOpts);
  }

  async addTrendingCalculationJob(
    data: any,
    options?: JobsOptions,
  ): Promise<Job<any> | null> {
    if (!this.leaderboardQueue) return null;
    const jobOpts: JobsOptions = { ...DEFAULT_JOB_OPTIONS, ...options };
    const jobName = JOB_TYPES.RANKINGS.TRENDING_CALCULATION;
    this.logger.log(`Enqueuing trending calculation job "${jobName}"`);
    return this.leaderboardQueue.add(jobName, data, jobOpts);
  }

  async addHistoricalSnapshotJob(
    data: any,
    options?: JobsOptions,
  ): Promise<Job<any> | null> {
    if (!this.leaderboardQueue) return null;
    const jobOpts: JobsOptions = { ...DEFAULT_JOB_OPTIONS, ...options };
    const jobName = JOB_TYPES.RANKINGS.HISTORICAL_SNAPSHOT;
    this.logger.log(`Enqueuing historical snapshot job "${jobName}"`);
    return this.leaderboardQueue.add(jobName, data, jobOpts);
  }

  async addRankingCacheRefreshJob(
    data: any,
    options?: JobsOptions,
  ): Promise<Job<any> | null> {
    if (!this.leaderboardQueue) return null;
    const jobOpts: JobsOptions = { ...DEFAULT_JOB_OPTIONS, ...options };
    const jobName = JOB_TYPES.RANKINGS.CACHE_REFRESH;
    this.logger.log(`Enqueuing ranking cache refresh job "${jobName}"`);
    return this.leaderboardQueue.add(jobName, data, jobOpts);
  }

  // --- Internal Queue Monitoring Helpers ---

  async getQueueStats(queueName: string): Promise<QueueJobCounts> {
    const queue = this.queueMap[queueName];
    if (!queue) {
      throw new Error(`Queue with name "${queueName}" not found`);
    }

    const counts = await queue.getJobCounts(
      'active',
      'waiting',
      'completed',
      'failed',
      'delayed',
    );
    return {
      active: counts.active || 0,
      waiting: counts.waiting || 0,
      completed: counts.completed || 0,
      failed: counts.failed || 0,
      delayed: counts.delayed || 0,
    };
  }

  async getAllQueuesStats(): Promise<AllQueuesStats> {
    const stats: AllQueuesStats = {};
    for (const [name, queue] of Object.entries(this.queueMap)) {
      try {
        const counts = await queue.getJobCounts(
          'active',
          'waiting',
          'completed',
          'failed',
          'delayed',
        );
        stats[name] = {
          active: counts.active || 0,
          waiting: counts.waiting || 0,
          completed: counts.completed || 0,
          failed: counts.failed || 0,
          delayed: counts.delayed || 0,
        };
      } catch (err: any) {
        this.logger.warn(
          `Failed to fetch stats for queue ${name}: ${err.message}`,
        );
        stats[name] = {
          active: 0,
          waiting: 0,
          completed: 0,
          failed: 0,
          delayed: 0,
        };
      }
    }
    return stats;
  }

  async getActiveJobs(queueName: string): Promise<Job[]> {
    const queue = this.getQueueInstance(queueName);
    return queue.getActive();
  }

  async getWaitingJobs(queueName: string): Promise<Job[]> {
    const queue = this.getQueueInstance(queueName);
    return queue.getWaiting();
  }

  async getFailedJobs(queueName: string): Promise<Job[]> {
    const queue = this.getQueueInstance(queueName);
    return queue.getFailed();
  }

  async getCompletedJobs(queueName: string): Promise<Job[]> {
    const queue = this.getQueueInstance(queueName);
    return queue.getCompleted();
  }

  async cleanQueue(
    queueName: string,
    gracePeriodMs = 0,
    limit = 1000,
  ): Promise<void> {
    const queue = this.getQueueInstance(queueName);
    await queue.clean(gracePeriodMs, limit, 'completed');
    await queue.clean(gracePeriodMs, limit, 'failed');
  }

  private toSafeJobId(value: string): string {
    return value.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 180);
  }

  private getQueueInstance(queueName: string): Queue {
    const queue = this.queueMap[queueName];
    if (!queue) {
      throw new Error(`Queue with name "${queueName}" not found`);
    }
    return queue;
  }
}
