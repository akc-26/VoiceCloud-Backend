import { NotificationType } from './entities/notification.entity';
import { NotificationsService } from './notifications.service';

describe('Admin notification delivery visibility', () => {
  it('returns persisted delivery records across users with pagination and filters', async () => {
    const rows = [
      {
        id: 'notification-1',
        userId: 'user-1',
        type: NotificationType.SYSTEM,
        deliveryStatus: 'NO_DEVICE',
        deliveryAttemptCount: 1,
      },
    ];
    const notificationRepository = {
      findAndCount: jest.fn().mockResolvedValue([rows, 1]),
    } as any;
    const service = new NotificationsService(
      notificationRepository,
      {} as any,
      {} as any,
    );

    const result = await service.getAdminNotifications({
      page: 2,
      limit: 10,
      type: NotificationType.SYSTEM,
      isRead: false,
    });

    expect(result).toEqual({
      data: rows,
      total: 1,
      page: 2,
      limit: 10,
      totalPages: 1,
    });
    expect(notificationRepository.findAndCount).toHaveBeenCalledWith({
      where: { type: NotificationType.SYSTEM, isRead: false },
      order: { createdAt: 'DESC' },
      skip: 10,
      take: 10,
    });
  });
});
