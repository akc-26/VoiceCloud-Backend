import { api } from './api';

export interface AdminNotificationRecord {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  deliveryStatus: string;
  deliveryAttemptCount: number;
  lastDeliveryAttemptAt?: string | null;
  deliveredAt?: string | null;
  lastDeliveryError?: string | null;
  createdAt: string;
}

export const notificationsAdminService = {
  async getDeliveryLog(params: { page?: number; limit?: number } = {}) {
    const res = await api.get('/notifications/admin/delivery-log', { params });
    return res.data as {
      data: AdminNotificationRecord[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  },
  async createNotification(dto: {
    userId: string;
    type: string;
    title: string;
    message: string;
    operationKey?: string;
  }) {
    const res = await api.post<AdminNotificationRecord>(
      '/notifications/admin',
      dto,
    );
    return res.data;
  },
};
