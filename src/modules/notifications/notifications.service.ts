import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { QueryNotificationDto } from './dto/query-notification.dto';
import { EventsGateway } from '../../common/events/events.gateway';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async createNotification(dto: CreateNotificationDto): Promise<Notification> {
    const notification = this.notificationRepository.create({
      userId: dto.userId,
      senderId: dto.senderId ?? null,
      type: dto.type,
      title: dto.title,
      message: dto.message,
      data: dto.data ?? null,
      isRead: false,
      readAt: null,
    });

    const saved = await this.notificationRepository.save(notification);

    // Broadcast Realtime Event
    this.eventsGateway.broadcastNotificationEvent('notification:new', {
      userId: saved.userId,
      notification: saved,
    });

    return saved;
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

    if (query.type) {
      where.type = query.type;
    }

    if (query.isRead !== undefined) {
      where.isRead = query.isRead;
    }

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

    if (unreadList.length === 0) {
      return { success: true, updatedCount: 0 };
    }

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
