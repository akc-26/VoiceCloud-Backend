import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { QueueService } from './queue.service';
import { QUEUE_NAMES, JOB_TYPES } from './queue.constants';

describe('QueueService', () => {
  let service: QueueService;

  const mockQueue = () => ({
    add: jest
      .fn()
      .mockImplementation((jobName, data, opts) =>
        Promise.resolve({ id: 'job-123', name: jobName, data, opts }),
      ),
    getJobCounts: jest.fn().mockResolvedValue({
      active: 1,
      waiting: 2,
      completed: 10,
      failed: 0,
      delayed: 0,
    }),
    getActive: jest.fn().mockResolvedValue([]),
    getWaiting: jest.fn().mockResolvedValue([]),
    getFailed: jest.fn().mockResolvedValue([]),
    getCompleted: jest.fn().mockResolvedValue([]),
    clean: jest.fn().mockResolvedValue([]),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueService,
        {
          provide: getQueueToken(QUEUE_NAMES.NOTIFICATION),
          useValue: mockQueue(),
        },
        { provide: getQueueToken(QUEUE_NAMES.REMINDER), useValue: mockQueue() },
        {
          provide: getQueueToken(QUEUE_NAMES.SUBSCRIPTION),
          useValue: mockQueue(),
        },
        { provide: getQueueToken(QUEUE_NAMES.PAYOUT), useValue: mockQueue() },
        {
          provide: getQueueToken(QUEUE_NAMES.RTC_CLEANUP),
          useValue: mockQueue(),
        },
      ],
    }).compile();

    service = module.get<QueueService>(QueueService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should enqueue notification job', async () => {
    const job = await service.addNotificationJob({
      userId: 'user-1',
      title: 'Hello',
      body: 'World',
    });

    expect(job.id).toBe('job-123');
    expect(job.name).toBe(JOB_TYPES.NOTIFICATION.SEND_PUSH);
  });

  it('should enqueue reminder job', async () => {
    const job = await service.addReminderJob({
      scheduledRoomId: 'room-1',
      title: 'Voice Room',
      minutesBeforeStart: 15,
    });

    expect(job.id).toBe('job-123');
    expect(job.name).toBe(JOB_TYPES.REMINDER.ROOM_REMINDER);
  });

  it('should enqueue subscription job', async () => {
    const job = await service.addSubscriptionJob({
      subscriptionId: 'sub-1',
      action: 'expire',
    });

    expect(job.id).toBe('job-123');
    expect(job.name).toBe(JOB_TYPES.SUBSCRIPTION.EXPIRE_SUBSCRIPTION);
  });

  it('should enqueue payout job', async () => {
    const job = await service.addPayoutJob({
      payoutRequestId: 'payout-1',
    });

    expect(job.id).toBe('job-123');
    expect(job.name).toBe(JOB_TYPES.PAYOUT.PROCESS_PAYOUT);
  });

  it('should enqueue RTC cleanup job', async () => {
    const job = await service.addRtcCleanupJob({
      roomId: 'room-101',
      action: 'cleanup_stale_room',
    });

    expect(job.id).toBe('job-123');
    expect(job.name).toBe(JOB_TYPES.RTC_CLEANUP.CLEANUP_STALE_ROOM);
  });

  it('should retrieve statistics for a single queue', async () => {
    const stats = await service.getQueueStats(QUEUE_NAMES.NOTIFICATION);
    expect(stats.active).toBe(1);
    expect(stats.waiting).toBe(2);
    expect(stats.completed).toBe(10);
  });

  it('should retrieve statistics for all queues', async () => {
    const allStats = await service.getAllQueuesStats();
    expect(allStats[QUEUE_NAMES.NOTIFICATION]).toBeDefined();
    expect(allStats[QUEUE_NAMES.REMINDER]).toBeDefined();
    expect(allStats[QUEUE_NAMES.SUBSCRIPTION]).toBeDefined();
    expect(allStats[QUEUE_NAMES.PAYOUT]).toBeDefined();
    expect(allStats[QUEUE_NAMES.RTC_CLEANUP]).toBeDefined();
  });
});
