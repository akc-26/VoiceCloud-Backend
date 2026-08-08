import { NotificationProcessor } from '../../queue/processors/notification.processor';
import { NotificationsService } from './notifications.service';
import { Notification, NotificationType } from './entities/notification.entity';

describe('Notification delivery authority', () => {
  function setup() {
    const rows = new Map<string, any>();
    let seq = 0;
    const repository: any = {
      manager: null,
      findOne: jest.fn().mockImplementation(async ({ where }) => {
        if (where.id) return rows.get(where.id) || null;
        if (where.operationKey) {
          return (
            [...rows.values()].find(
              (row) => row.operationKey === where.operationKey,
            ) || null
          );
        }
        return null;
      }),
      create: jest.fn().mockImplementation((value) => ({
        id: `notification-${++seq}`,
        ...value,
      })),
      save: jest.fn().mockImplementation(async (value) => {
        rows.set(value.id, value);
        return value;
      }),
      findAndCount: jest.fn(),
      count: jest.fn(),
      find: jest.fn(),
      remove: jest.fn(),
    };
    const manager = {
      getRepository: jest.fn().mockImplementation((entity) => {
        if (entity === Notification) return repository;
        throw new Error('Unexpected repository');
      }),
    };
    repository.manager = {
      transaction: jest
        .fn()
        .mockImplementation((callback) => callback(manager)),
    };
    const deviceRepository = {
      find: jest.fn().mockResolvedValue([{ pushToken: 'token-1' }]),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    } as any;
    const gateway = { broadcastNotificationEvent: jest.fn() } as any;
    const service = new NotificationsService(
      repository,
      deviceRepository,
      gateway,
    );
    const firebase = {
      sendSingleNotification: jest
        .fn()
        .mockResolvedValue({ success: true, messageId: 'm1' }),
      sendMultiNotification: jest.fn(),
    } as any;
    const processor = new NotificationProcessor(
      firebase,
      service,
      deviceRepository,
    );
    return { rows, repository, service, processor, firebase, gateway };
  }

  it('persists an operation once and reuses it across creation retries', async () => {
    const { service, gateway } = setup();
    const dto = {
      userId: '11111111-1111-4111-8111-111111111111',
      type: NotificationType.SYSTEM,
      title: 'Payout update',
      message: 'Your payout is ready',
      operationKey: 'notification:payout-1',
    };
    const first = await service.createNotification(dto);
    const replay = await service.createNotification(dto);
    expect(replay.id).toBe(first.id);
    expect(gateway.broadcastNotificationEvent).toHaveBeenCalledTimes(1);
  });

  it('delivers the persisted notification and treats a repeated job as idempotent', async () => {
    const { service, processor, firebase } = setup();
    const notification = await service.createNotification({
      userId: '11111111-1111-4111-8111-111111111111',
      type: NotificationType.SYSTEM,
      title: 'VIP active',
      message: 'VIP activated',
      operationKey: 'notification:vip-1',
    });
    const job = {
      id: 'job-1',
      name: 'send-push',
      attemptsMade: 0,
      data: {
        notificationId: notification.id,
        userId: notification.userId,
        title: notification.title,
        body: notification.message,
      },
    } as any;

    const first = await processor.process(job);
    const replay = await processor.process(job);

    expect(first.success).toBe(true);
    expect(replay.idempotent).toBe(true);
    expect(firebase.sendSingleNotification).toHaveBeenCalledTimes(1);
    expect(
      (await service.getNotificationForDelivery(notification.id))
        .deliveryStatus,
    ).toBe('SENT');
  });
});
