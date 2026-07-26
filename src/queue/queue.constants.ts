export const QUEUE_NAMES = {
  NOTIFICATION: 'notification-queue',
  REMINDER: 'reminder-queue',
  SUBSCRIPTION: 'subscription-queue',
  PAYOUT: 'payout-queue',
  RTC_CLEANUP: 'rtc-cleanup-queue',
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
} as const;
