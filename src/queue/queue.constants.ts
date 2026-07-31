export const QUEUE_NAMES = {
  NOTIFICATION: 'notification-queue',
  REMINDER: 'reminder-queue',
  SUBSCRIPTION: 'subscription-queue',
  PAYOUT: 'payout-queue',
  RTC_CLEANUP: 'rtc-cleanup-queue',
  ANALYTICS_AGGREGATION: 'analytics-aggregation-queue',
  LEADERBOARD_CALCULATION: 'leaderboard-calculation-queue',
  POLL_EXPIRATION: 'poll-expiration-queue',
  QUIZ_EXPIRATION: 'quiz-expiration-queue',
  REGIONAL_PRICING_CACHE_REFRESH: 'regional-pricing-cache-refresh-queue',
  CHAT: 'chat-queue',
  GIFT: 'gift-queue',
  VIP: 'vip-queue',
  HOST_PERFORMANCE: 'host-performance-queue',
  HOST_EARNINGS: 'host-earnings-queue',
  HOST_REWARDS: 'host-rewards-queue',
  HOST_VERIFICATION: 'host-verification-queue',
  HOST_ANALYTICS: 'host-analytics-queue',
  TASKS: 'tasks-queue',
  STORE: 'store-queue',
  REFERRAL: 'referral-queue',
} as const;

export type QueueNameType = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export const DEFAULT_JOB_OPTIONS = {
  attempts: 5,
  backoff: {
    type: 'exponential',
    delay: 1000,
  },
  removeOnComplete: 100,
  removeOnFail: 500,
};

export const JOB_TYPES = {
  NOTIFICATION: {
    SEND_PUSH: 'send-push',
    SEND_BATCH: 'send-batch',
  },
  REMINDER: {
    ROOM_REMINDER: 'room-reminder',
    COUNTDOWN_NOTIFY: 'countdown-notify',
  },
  SUBSCRIPTION: {
    EXPIRE_SUBSCRIPTION: 'expire-subscription',
    RENEWAL_REMINDER: 'renewal-reminder',
  },
  PAYOUT: {
    PROCESS_PAYOUT: 'process-payout',
  },
  RTC_CLEANUP: {
    CLEANUP_STALE_ROOM: 'cleanup-stale-room',
    ARCHIVE_SCHEDULED_ROOM: 'archive-scheduled-room',
    CLEANUP_SPEAKER_QUEUE: 'cleanup-speaker-queue',
  },
  CHAT: {
    PUSH_NOTIFICATION: 'chat-push-notification',
    PROCESS_ATTACHMENT: 'chat-process-attachment',
    GENERATE_WAVEFORM: 'chat-generate-waveform',
    ANALYTICS: 'chat-analytics',
    TYPING_CLEANUP: 'chat-typing-cleanup',
  },
  GIFT: {
    ANIMATION_DISPATCH: 'gift-animation-dispatch',
    COMBO_EXPIRATION: 'gift-combo-expiration',
    SEASONAL_ACTIVATION: 'gift-seasonal-activation',
    SEASONAL_EXPIRATION: 'gift-seasonal-expiration',
    STATISTICS_AGGREGATION: 'gift-statistics-aggregation',
    CACHE_REFRESH: 'gift-cache-refresh',
  },
  VIP: {
    REWARD_DISTRIBUTION: 'reward-distribution',
    MEMBERSHIP_EXPIRATION: 'membership-expiration',
    RENEWAL_REMINDER: 'renewal-reminder',
    BENEFIT_CACHE_REFRESH: 'benefit-cache-refresh',
    ANALYTICS_AGGREGATION: 'vip-analytics-aggregation',
  },
  HOST: {
    PERFORMANCE_AGGREGATE: 'host-performance-aggregate',
    EARNINGS_CALCULATE: 'host-earnings-calculate',
    REWARD_DISTRIBUTE: 'host-reward-distribute',
    VERIFICATION_PROCESS: 'host-verification-process',
    ANALYTICS_REFRESH: 'host-analytics-refresh',
  },
  RANKINGS: {
    RANKING_CALCULATION: 'calculate-rankings',
    TRENDING_CALCULATION: 'calculate-trending',
    HISTORICAL_SNAPSHOT: 'create-historical-snapshot',
    CACHE_REFRESH: 'refresh-ranking-cache',
    LEADERBOARD_AGGREGATION: 'aggregate-leaderboards',
  },
  TASKS: {
    DAILY_RESET: 'daily-reset',
    WEEKLY_RESET: 'weekly-reset',
    MONTHLY_RESET: 'monthly-reset',
    ACHIEVEMENT_CHECK: 'achievement-check',
    XP_CALCULATION: 'xp-calculation',
    REWARD_DISTRIBUTION: 'reward-distribution',
    SEASON_ROLLOVER: 'season-rollover',
    STREAK_UPDATE: 'streak-update',
  },
  STORE: {
    EXPIRE_INVENTORY_ITEMS: 'expire-inventory-items',
    EXPIRATION_REMINDER: 'expiration-reminder',
    CATALOG_CACHE_REFRESH: 'catalog-cache-refresh',
  },
  REFERRAL: {
    VALIDATE_REFERRAL: 'validate-referral',
    REWARD_DISTRIBUTION: 'reward-distribution',
    CAMPAIGN_CLEANUP: 'campaign-cleanup',
    ANALYTICS_REFRESH: 'analytics-refresh',
  },
} as const;
