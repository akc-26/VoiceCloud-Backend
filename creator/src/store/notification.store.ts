import { create } from 'zustand';
import { CreatorNotification } from '../types/creator.types';

interface NotificationState {
  notifications: CreatorNotification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  addNotification: (notification: CreatorNotification) => void;
  setNotifications: (notifications: CreatorNotification[], unreadCount?: number) => void;
}

const initialNotifications: CreatorNotification[] = [];

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: initialNotifications,
  unreadCount: initialNotifications.filter((n) => !n.read).length,
  markAsRead: (id) =>
    set((state) => {
      const target = state.notifications.find((n) => n.id === id);
      const updated = state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      );
      return {
        notifications: updated,
        unreadCount: Math.max(0, state.unreadCount - (target && !target.read ? 1 : 0)),
      };
    }),
  markAllAsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    })),
  addNotification: (notification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + (notification.read ? 0 : 1),
    })),
  setNotifications: (notifications, unreadCount) =>
    set({
      notifications,
      unreadCount:
        unreadCount !== undefined
          ? unreadCount
          : notifications.filter((n) => !n.read).length,
    }),
}));
