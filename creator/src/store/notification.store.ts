import { create } from 'zustand';
import { CreatorNotification } from '../types/creator.types';

interface NotificationState {
  notifications: CreatorNotification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  addNotification: (notification: CreatorNotification) => void;
}

const initialNotifications: CreatorNotification[] = [
  {
    id: 'notif-1',
    title: 'New VIP Subscription',
    message: 'User @alex_audionut subscribed to your VIP Tier plan!',
    type: 'subscription',
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
  },
  {
    id: 'notif-2',
    title: 'Virtual Gift Received',
    message: 'Received a "Dragon Castle" virtual gift (5,000 coins) in Lounge #102!',
    type: 'gift',
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    id: 'notif-3',
    title: 'Payout Request Approved',
    message: 'Your payout request #PR-8821 for $1,250.00 USD has been approved by Admin.',
    type: 'payout',
    read: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  },
  {
    id: 'notif-4',
    title: 'Weekly Creator Milestone',
    message: 'Congratulations! You reached 14,000 followers milestone.',
    type: 'system',
    read: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
];

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: initialNotifications,
  unreadCount: initialNotifications.filter((n) => !n.read).length,
  markAsRead: (id) =>
    set((state) => {
      const updated = state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      );
      return {
        notifications: updated,
        unreadCount: updated.filter((n) => !n.read).length,
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
}));
