import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotificationProcessor } from './notification.processor';
import { ReminderProcessor } from './reminder.processor';
import { SubscriptionProcessor } from './subscription.processor';
import { PayoutProcessor } from './payout.processor';
import { RTCCleanupProcessor } from './rtc-cleanup.processor';
import { FirebaseMessagingService } from '../firebase/firebase-messaging.service';
import { NotificationsService } from '../../modules/notifications/notifications.service';
import { RedisStateService } from '../../redis/redis-state.service';
import { UserDevice } from '../../modules/users/entities/user-device.entity';
import { ScheduledRoom } from '../../modules/rooms/entities/scheduled-room.entity';
import { CreatorSubscription } from '../../modules/users/entities/creator-subscription.entity';
import { CreatorPayoutRequest } from '../../modules/users/entities/creator-payout-request.entity';
import { SubscriptionStatus, PayoutStatus, ScheduledRoomStatus } from '../../common/enums';

describe('Phase 3C Queue Processors (Workers)', () => {
  let notificationProcessor: NotificationProcessor;
  let reminderProcessor: ReminderProcessor;
  let subscriptionProcessor: SubscriptionProcessor;
  let payoutProcessor: PayoutProcessor;
  let rtcCleanupProcessor: RTCCleanupProcessor;

  const mockFirebaseService = {
    sendSingleNotification: jest.fn().mockResolvedValue({ success: true, messageId: 'msg-1' }),
    sendMultiNotification: jest.fn().mockResolvedValue({ success: true, successCount: 2 }),
  };

  const mockNotificationsService = {
    createNotification: jest.fn().mockResolvedValue({ id: 'notif-1' }),
  };

  const mockUserDeviceRepo = {
    find: jest.fn().mockResolvedValue([
      { userId: 'u1', pushToken: 'token-u1' },
    ]),
  };

  const mockScheduledRoomRepo = {
    findOne: jest.fn().mockResolvedValue({
      id: 'room-1',
      title: 'Scheduled Tech Talk',
      hostId: 'host-1',
      status: ScheduledRoomStatus.SCHEDULED,
      host: { displayName: 'Host Name' },
    }),
    save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
  };

  const mockSubscriptionRepo = {
    findOne: jest.fn().mockResolvedValue({
      id: 'sub-1',
      subscriberId: 'sub-user-1',
      creatorId: 'creator-1',
      status: SubscriptionStatus.ACTIVE,
      creator: { displayName: 'Creator Name' },
      plan: { title: 'VIP Plan' },
    }),
    save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
  };

  const mockPayoutRepo = {
    findOne: jest.fn().mockResolvedValue({
      id: 'payout-1',
      creatorId: 'creator-1',
      diamondAmount: 1000,
      payoutAmount: 5.0,
      status: PayoutStatus.PENDING,
    }),
    save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
  };

  const mockRedisStateService = {
    cleanupRoomState: jest.fn().mockResolvedValue(undefined),
    getQueue: jest.fn().mockResolvedValue([{ userId: 'u1' }]),
    reorderQueue: jest.fn().mockResolvedValue({ queue: [] }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationProcessor,
        ReminderProcessor,
        SubscriptionProcessor,
        PayoutProcessor,
        RTCCleanupProcessor,
        { provide: FirebaseMessagingService, useValue: mockFirebaseService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: RedisStateService, useValue: mockRedisStateService },
        { provide: getRepositoryToken(UserDevice), useValue: mockUserDeviceRepo },
        { provide: getRepositoryToken(ScheduledRoom), useValue: mockScheduledRoomRepo },
        { provide: getRepositoryToken(CreatorSubscription), useValue: mockSubscriptionRepo },
        { provide: getRepositoryToken(CreatorPayoutRequest), useValue: mockPayoutRepo },
      ],
    }).compile();

    notificationProcessor = module.get<NotificationProcessor>(NotificationProcessor);
    reminderProcessor = module.get<ReminderProcessor>(ReminderProcessor);
    subscriptionProcessor = module.get<SubscriptionProcessor>(SubscriptionProcessor);
    payoutProcessor = module.get<PayoutProcessor>(PayoutProcessor);
    rtcCleanupProcessor = module.get<RTCCleanupProcessor>(RTCCleanupProcessor);
  });

  describe('NotificationProcessor', () => {
    it('should process push notification job using userId push token', async () => {
      const job = {
        id: 'job-1',
        name: 'send-push',
        attemptsMade: 0,
        data: {
          userId: 'u1',
          title: 'New Gift',
          body: 'You received a gift!',
        },
      } as any;

      const res = await notificationProcessor.process(job);
      expect(res.success).toBe(true);
      expect(mockFirebaseService.sendSingleNotification).toHaveBeenCalledWith(
        'token-u1',
        expect.objectContaining({ title: 'New Gift' }),
      );
    });
  });

  describe('ReminderProcessor', () => {
    it('should process scheduled room reminder and notify host and attendees', async () => {
      const job = {
        id: 'job-2',
        name: 'room-reminder',
        attemptsMade: 0,
        data: {
          scheduledRoomId: 'room-1',
          title: 'Scheduled Tech Talk',
          hostId: 'host-1',
          rsvpUserIds: ['user-2'],
          minutesBeforeStart: 15,
        },
      } as any;

      const res = await reminderProcessor.process(job);
      expect(res.success).toBe(true);
      expect(res.notifiedCount).toBe(2);
      expect(mockNotificationsService.createNotification).toHaveBeenCalled();
    });
  });

  describe('SubscriptionProcessor', () => {
    it('should transition expired creator subscription to EXPIRED status', async () => {
      const job = {
        id: 'job-3',
        name: 'expire-subscription',
        attemptsMade: 0,
        data: {
          subscriptionId: 'sub-1',
          action: 'expire',
        },
      } as any;

      const res = await subscriptionProcessor.process(job);
      expect(res.success).toBe(true);
      expect(res.status).toBe(SubscriptionStatus.EXPIRED);
      expect(mockSubscriptionRepo.save).toHaveBeenCalled();
    });
  });

  describe('PayoutProcessor', () => {
    it('should transition payout request status to PROCESSED and record timestamp', async () => {
      const job = {
        id: 'job-4',
        name: 'process-payout',
        attemptsMade: 0,
        data: {
          payoutRequestId: 'payout-1',
          targetStatus: PayoutStatus.PROCESSED,
          reviewedBy: 'admin-1',
        },
      } as any;

      const res = await payoutProcessor.process(job);
      expect(res.success).toBe(true);
      expect(res.status).toBe(PayoutStatus.PROCESSED);
      expect(mockPayoutRepo.save).toHaveBeenCalled();
    });
  });

  describe('RTCCleanupProcessor', () => {
    it('should clean stale Redis room state', async () => {
      const job = {
        id: 'job-5',
        name: 'cleanup-stale-room',
        attemptsMade: 0,
        data: {
          roomId: 'room-101',
          action: 'cleanup_stale_room',
        },
      } as any;

      const res = await rtcCleanupProcessor.process(job);
      expect(res.success).toBe(true);
      expect(mockRedisStateService.cleanupRoomState).toHaveBeenCalledWith('room-101');
    });

    it('should archive completed scheduled room', async () => {
      const job = {
        id: 'job-6',
        name: 'archive-scheduled-room',
        attemptsMade: 0,
        data: {
          scheduledRoomId: 'room-1',
          action: 'archive_scheduled_room',
        },
      } as any;

      const res = await rtcCleanupProcessor.process(job);
      expect(res.success).toBe(true);
      expect(mockScheduledRoomRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: ScheduledRoomStatus.COMPLETED }),
      );
    });
  });
});
