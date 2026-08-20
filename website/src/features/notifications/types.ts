export type NotificationType = 'IN_APP' | 'SYSTEM' | 'ROOM_INVITATION' | 'GIFT' | 'VIP' | 'AGENCY' | 'HOST_APPROVAL' | 'ANNOUNCEMENT';

export interface VoiceCloudNotification {
  id: string;
  userId: string;
  senderId?: string | null;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown> | null;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationPage {
  data: VoiceCloudNotification[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
