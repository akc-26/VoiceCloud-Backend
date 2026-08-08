import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { UserDevice } from '../users/entities/user-device.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { QueryNotificationDto } from './dto/query-notification.dto';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { EventsGateway } from '../../common/events/events.gateway';

export type NotificationDeliveryStatus =
  'PENDING' | 'SENDING' | 'SENT' | 'FAILED' | 'NO_DEVICE';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(UserDevice)
    private readonly userDeviceRepository: Repository<UserDevice>,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async registerDevice(
    userId: string,
    dto: RegisterDeviceDto,
  ): Promise<UserDevice> {
    let device = await this.userDeviceRepository.findOne({
      where: { userId, deviceId: dto.deviceId },
    });

    if (!device) {
      device = await this.userDeviceRepository.findOne({
        where: { deviceId: dto.deviceId },
      });
    }

    const deviceType = dto.deviceType || dto.platform || 'mobile';

    if (device) {
      device.userId = userId;
      device.deviceType = deviceType;
      if (dto.deviceName) device.deviceName = dto.deviceName;
      if (dto.osVersion) device.osVersion = dto.osVersion;
      if (dto.appVersion) device.appVersion = dto.appVersion;
      if (dto.pushToken) device.pushToken = dto.pushToken;
      device.lastUsedAt = new Date();
      return this.userDeviceRepository.save(device);
    }

    device = this.userDeviceRepository.create({
      userId,
      deviceId: dto.deviceId,
      deviceType,
      deviceName: dto.deviceName || 'Unknown Device',
      osVersion: dto.osVersion || undefined,
      appVersion: dto.appVersion || undefined,
      pushToken: dto.pushToken || undefined,
      lastUsedAt: new Date(),
    });

    return this.userDeviceRepository.save(device);
  }

  async getNotificationById(
    userId: string,
    notificationId: string,
  ): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException(
        `Notification with ID ${notificationId} not found`,
      );
    }

    return notification;
  }

  async createNotification(dto: CreateNotificationDto): Promise<Notification> {
    const operationKey = dto.operationKey?.trim() || null;
    if (operationKey) {
      const replay = await this.notificationRepository.findOne({
        where: { operationKey },
      });
      if (replay) return replay;
    }

    const notification = this.notificationRepository.create({
      userId: dto.userId,
      senderId: dto.senderId ?? null,
      type: dto.type,
      title: dto.title,
      message: dto.message,
      data: dto.data ?? null,
      isRead: false,
      readAt: null,
      operationKey,
      deliveryStatus: 'PENDING',
      deliveryAttemptCount: 0,
      lastDeliveryAttemptAt: null,
      deliveredAt: null,
      lastDeliveryError: null,
    });

    let saved: Notification;
    try {
      saved = await this.notificationRepository.save(notification);
    } catch (error) {
      if (operationKey) {
        const replay = await this.notificationRepository.findOne({
          where: { operationKey },
        });
        if (replay) return replay;
      }
      throw error;
    }

    this.eventsGateway.broadcastNotificationEvent('notification:new', {
      userId: saved.userId,
      notification: saved,
    });

    return saved;
  }

  async getNotificationForDelivery(
    notificationId: string,
  ): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId },
    });
    if (!notification) {
      throw new NotFoundException(
        `Notification with ID ${notificationId} not found`,
      );
    }
    return notification;
  }

  async markDeliveryAttempt(notificationId: string): Promise<Notification> {
    return this.notificationRepository.manager.transaction(async (manager) => {
      const repository = manager.getRepository(Notification);
      const notification = await repository.findOne({
        where: { id: notificationId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!notification) {
        throw new NotFoundException(
          `Notification with ID ${notificationId} not found`,
        );
      }
      if (notification.deliveryStatus === 'SENT') return notification;
      notification.deliveryAttemptCount =
        Number(notification.deliveryAttemptCount || 0) + 1;
      notification.lastDeliveryAttemptAt = new Date();
      notification.deliveryStatus = 'SENDING';
      notification.lastDeliveryError = null;
      return repository.save(notification);
    });
  }

  async markDeliveryResult(
    notificationId: string,
    status: Extract<
      NotificationDeliveryStatus,
      'SENT' | 'FAILED' | 'NO_DEVICE'
    >,
    error?: string,
  ): Promise<Notification> {
    return this.notificationRepository.manager.transaction(async (manager) => {
      const repository = manager.getRepository(Notification);
      const notification = await repository.findOne({
        where: { id: notificationId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!notification) {
        throw new NotFoundException(
          `Notification with ID ${notificationId} not found`,
        );
      }
      if (notification.deliveryStatus === 'SENT') return notification;
      notification.deliveryStatus = status;
      notification.deliveredAt = status === 'SENT' ? new Date() : null;
      notification.lastDeliveryError = error?.slice(0, 4000) || null;
      return repository.save(notification);
    });
  }

  async getUserNotifications(
    userId: string,
    query: QueryNotificationDto,
  ): Promise<{
    data: Notification[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 20;
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<Notification> = { userId };

    if (query.type) where.type = query.type;
    if (query.isRead !== undefined) where.isRead = query.isRead;

    const [data, total] = await this.notificationRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getUnreadCount(userId: string): Promise<{ unreadCount: number }> {
    const count = await this.notificationRepository.count({
      where: { userId, isRead: false },
    });
    return { unreadCount: count };
  }

  async markAsRead(
    userId: string,
    notificationId: string,
  ): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException(
        `Notification with ID ${notificationId} not found`,
      );
    }

    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();
      await this.notificationRepository.save(notification);

      this.eventsGateway.broadcastNotificationEvent('notification:read', {
        userId,
        notificationId,
        readAt: notification.readAt,
      });
    }

    return notification;
  }

  async markAllAsRead(
    userId: string,
  ): Promise<{ success: boolean; updatedCount: number }> {
    const unreadList = await this.notificationRepository.find({
      where: { userId, isRead: false },
    });

    if (unreadList.length === 0) return { success: true, updatedCount: 0 };

    const now = new Date();
    for (const item of unreadList) {
      item.isRead = true;
      item.readAt = now;
    }

    await this.notificationRepository.save(unreadList);

    this.eventsGateway.broadcastNotificationEvent('notification:read', {
      userId,
      allMarked: true,
      updatedCount: unreadList.length,
      readAt: now,
    });

    return { success: true, updatedCount: unreadList.length };
  }

  async deleteNotification(
    userId: string,
    notificationId: string,
  ): Promise<{ success: boolean }> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException(
        `Notification with ID ${notificationId} not found`,
      );
    }

    await this.notificationRepository.remove(notification);

    this.eventsGateway.broadcastNotificationEvent('notification:deleted', {
      userId,
      notificationId,
    });

    return { success: true };
  }
}
