import { apiClient } from '@/api/client';
import type { NotificationPage, NotificationType, VoiceCloudNotification } from './types';

export const notificationsApi = {
  async list(filter: { type?: NotificationType; isRead?: boolean; page?: number; limit?: number } = {}): Promise<NotificationPage> {
    const { data } = await apiClient.get('/notifications', { params: { page: filter.page ?? 1, limit: filter.limit ?? 40, type: filter.type, isRead: filter.isRead } });
    return data;
  },
  async unreadCount(): Promise<{ unreadCount: number }> {
    const { data } = await apiClient.get('/notifications/unread-count');
    return data;
  },
  async markRead(id: string): Promise<VoiceCloudNotification> {
    const { data } = await apiClient.patch(`/notifications/${id}/read`);
    return data;
  },
  async markAllRead(): Promise<{ success: boolean; updatedCount: number }> {
    const { data } = await apiClient.patch('/notifications/read-all');
    return data;
  },
  async remove(id: string): Promise<{ success: boolean }> {
    const { data } = await apiClient.delete(`/notifications/${id}`);
    return data;
  },
};
