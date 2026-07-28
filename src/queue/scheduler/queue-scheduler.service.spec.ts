import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QueueSchedulerService } from './queue-scheduler.service';
import { QueueService } from '../queue.service';
import { CreatorSubscription } from '../../modules/users/entities/creator-subscription.entity';
import { ScheduledRoom } from '../../modules/rooms/entities/scheduled-room.entity';
import { SubscriptionStatus, ScheduledRoomStatus } from '../../common/enums';

describe('QueueSchedulerService', () => {
  let schedulerService: QueueSchedulerService;

  const mockSubscriptionRepo = {
    find: jest.fn().mockResolvedValue([
      {
        id: 'sub-expired-1',
        subscriberId: 'subscriber-1',
        creatorId: 'creator-1',
        status: SubscriptionStatus.ACTIVE,
        expiresAt: new Date(Date.now() - 10000),
      },
    ]),
  };

  const mockScheduledRoomRepo = {
    find: jest.fn().mockResolvedValue([
      {
        id: 'room-upcoming-1',
        title: 'Upcoming Talk',
        hostId: 'host-1',
        status: ScheduledRoomStatus.SCHEDULED,
        scheduledStartTime: new Date(Date.now() + 5 * 60 * 1000),
      },
    ]),
  };

  const mockQueueService = {
    addSubscriptionJob: jest.fn().mockResolvedValue({ id: 'job-sub' }),
    addReminderJob: jest.fn().mockResolvedValue({ id: 'job-rem' }),
    addRtcCleanupJob: jest.fn().mockResolvedValue({ id: 'job-rtc' }),
    cleanQueue: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueSchedulerService,
        { provide: getRepositoryToken(CreatorSubscription), useValue: mockSubscriptionRepo },
        { provide: getRepositoryToken(ScheduledRoom), useValue: mockScheduledRoomRepo },
        { provide: QueueService, useValue: mockQueueService },
      ],
    }).compile();

    schedulerService = module.get<QueueSchedulerService>(QueueSchedulerService);
  });

  it('should be defined', () => {
    expect(schedulerService).toBeDefined();
  });

  it('should scan and enqueue expired subscriptions', async () => {
    await schedulerService.handleSubscriptionExpiryScan();
    expect(mockSubscriptionRepo.find).toHaveBeenCalled();
    expect(mockQueueService.addSubscriptionJob).toHaveBeenCalledWith({
      subscriptionId: 'sub-expired-1',
      action: 'expire',
      subscriberId: 'subscriber-1',
      creatorId: 'creator-1',
    });
  });

  it('should scan and enqueue upcoming room reminders', async () => {
    await schedulerService.handleScheduledRoomReminderScan();
    expect(mockScheduledRoomRepo.find).toHaveBeenCalled();
    expect(mockQueueService.addReminderJob).toHaveBeenCalledWith(
      expect.objectContaining({
        scheduledRoomId: 'room-upcoming-1',
        title: 'Upcoming Talk',
        hostId: 'host-1',
      }),
    );
  });

  it('should run RTC cleanup scan', async () => {
    await schedulerService.handleRtcCleanupScan();
    expect(mockQueueService.addRtcCleanupJob).toHaveBeenCalledWith({
      action: 'cleanup_stale_room',
    });
  });

  it('should run daily maintenance jobs', async () => {
    await schedulerService.handleDailyMaintenanceJobs();
    expect(mockQueueService.cleanQueue).toHaveBeenCalledTimes(5);
  });
});
