import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Socket } from 'socket.io-client';
import {
  creatorSocketService,
  SocketConnectionStatus,
} from './socket.service';
import { useRealtimeToast } from '../components/common/RealtimeToast';
import { useNotificationStore } from '../store/notification.store';
import { useAuthStore } from '../store/auth.store';

interface SocketContextType {
  socket: Socket | null;
  status: SocketConnectionStatus;
  connect: () => void;
  disconnect: () => void;
  emit: (event: string, data?: any) => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  status: 'offline',
  connect: () => {},
  disconnect: () => {},
  emit: () => {},
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const { showToast } = useRealtimeToast();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const [socket, setSocket] = useState<Socket | null>(creatorSocketService.getSocket());
  const [status, setStatus] = useState<SocketConnectionStatus>(creatorSocketService.getStatus());

  const connect = useCallback(() => {
    const s = creatorSocketService.connect();
    setSocket(s);
  }, []);

  const disconnect = useCallback(() => {
    creatorSocketService.disconnect();
    setSocket(null);
  }, []);

  const emit = useCallback((event: string, data?: any) => {
    creatorSocketService.emit(event, data);
  }, []);

  // Subscribe to connection status changes
  useEffect(() => {
    const unsubscribe = creatorSocketService.subscribeStatus((newStatus) => {
      setStatus(newStatus);
      setSocket(creatorSocketService.getSocket());
    });
    return unsubscribe;
  }, []);

  // Connect when authenticated, disconnect when logged out
  useEffect(() => {
    if (isAuthenticated) {
      connect();
    } else {
      disconnect();
    }
  }, [isAuthenticated, connect, disconnect]);

  // Set up real-time event listeners for React Query Cache & Toasts
  useEffect(() => {
    if (!socket) return;

    // 1. Notifications
    const handleNotifCreated = (payload: any) => {
      const data = payload?.data || payload;
      queryClient.invalidateQueries({ queryKey: ['creator', 'notifications'] });
      
      const title = data?.title || 'New Notification';
      const message = data?.message || 'You received a new creator notification.';
      
      addNotification({
        id: data?.id || `notif_${Date.now()}`,
        title,
        message,
        type: data?.type || 'system',
        read: false,
        createdAt: new Date().toISOString(),
      });

      showToast({
        title,
        message,
        severity: 'info',
        iconType: 'notification',
      });
    };

    const handleNotifUpdated = () => {
      queryClient.invalidateQueries({ queryKey: ['creator', 'notifications'] });
    };

    const handleNotifDeleted = () => {
      queryClient.invalidateQueries({ queryKey: ['creator', 'notifications'] });
    };

    // 2. Wallet Updates
    const handleWalletUpdated = (payload: any) => {
      const data = payload?.data || payload;
      queryClient.invalidateQueries({ queryKey: ['creator', 'wallet'] });
      queryClient.invalidateQueries({ queryKey: ['creator', 'earnings'] });
      queryClient.invalidateQueries({ queryKey: ['creator', 'dashboard'] });

      showToast({
        title: 'Wallet Updated',
        message: data?.message || 'Your diamond balance and earnings have been updated in real time.',
        severity: 'success',
        iconType: 'wallet',
      });
    };

    // 3. Virtual Gifts
    const handleGiftReceived = (payload: any) => {
      const data = payload?.data || payload;
      queryClient.invalidateQueries({ queryKey: ['creator', 'gifts'] });
      queryClient.invalidateQueries({ queryKey: ['creator', 'dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['creator', 'earnings'] });
      queryClient.invalidateQueries({ queryKey: ['creator', 'wallet'] });

      const giftName = data?.giftName || data?.name || 'a Virtual Gift';
      const senderName = data?.senderName || data?.username || 'a Fan';

      showToast({
        title: 'Gift Received! 🎁',
        message: `Received ${giftName} from @${senderName}!`,
        severity: 'info',
        iconType: 'gift',
      });
    };

    // 4. Followers
    const handleUserFollowed = (payload: any) => {
      const data = payload?.data || payload;
      queryClient.invalidateQueries({ queryKey: ['creator', 'followers'] });
      queryClient.invalidateQueries({ queryKey: ['creator', 'profile'] });
      queryClient.invalidateQueries({ queryKey: ['creator', 'dashboard'] });

      const username = data?.username || data?.followerName || 'A user';
      showToast({
        title: 'New Follower! 👤',
        message: `@${username} started following your creator channel!`,
        severity: 'info',
        iconType: 'follower',
      });
    };

    const handleUserUnfollowed = () => {
      queryClient.invalidateQueries({ queryKey: ['creator', 'followers'] });
      queryClient.invalidateQueries({ queryKey: ['creator', 'profile'] });
      queryClient.invalidateQueries({ queryKey: ['creator', 'dashboard'] });
    };

    // 5. Subscribers
    const handleSubscriberCreated = (payload: any) => {
      const data = payload?.data || payload;
      queryClient.invalidateQueries({ queryKey: ['creator', 'subscribers'] });
      queryClient.invalidateQueries({ queryKey: ['creator', 'subscription-plans'] });
      queryClient.invalidateQueries({ queryKey: ['creator', 'earnings'] });

      const username = data?.username || 'A supporter';
      showToast({
        title: 'New Subscriber! ⭐',
        message: `@${username} subscribed to your channel plan!`,
        severity: 'success',
        iconType: 'subscriber',
      });
    };

    const handleSubscriberCancelled = () => {
      queryClient.invalidateQueries({ queryKey: ['creator', 'subscribers'] });
      queryClient.invalidateQueries({ queryKey: ['creator', 'subscription-plans'] });
    };

    // 6. Live Rooms
    const handleRoomEvent = (payload: any) => {
      const data = payload?.data || payload;
      queryClient.invalidateQueries({ queryKey: ['creator', 'rooms'] });
      queryClient.invalidateQueries({ queryKey: ['creator', 'dashboard'] });

      if (payload?.event === 'room.started' || data?.action === 'started') {
        showToast({
          title: 'Live Room Broadcast',
          message: `Live room "${data?.title || 'Broadcast'}" is now live!`,
          severity: 'info',
          iconType: 'room',
        });
      } else if (payload?.event === 'room.ended' || data?.action === 'ended') {
        showToast({
          title: 'Live Room Ended',
          message: 'Your broadcast session has finished.',
          severity: 'info',
          iconType: 'room',
        });
      }
    };

    // 7. Schedule
    const handleScheduleEvent = () => {
      queryClient.invalidateQueries({ queryKey: ['creator', 'schedule'] });
      queryClient.invalidateQueries({ queryKey: ['creator', 'dashboard'] });
    };

    // Register socket listeners
    socket.on('notification.created', handleNotifCreated);
    socket.on('notification.updated', handleNotifUpdated);
    socket.on('notification.deleted', handleNotifDeleted);

    socket.on('wallet.updated', handleWalletUpdated);
    socket.on('gift.received', handleGiftReceived);

    socket.on('user.followed', handleUserFollowed);
    socket.on('user.unfollowed', handleUserUnfollowed);

    socket.on('subscriber.created', handleSubscriberCreated);
    socket.on('subscriber.cancelled', handleSubscriberCancelled);

    socket.on('room.created', handleRoomEvent);
    socket.on('room.started', handleRoomEvent);
    socket.on('room.ended', handleRoomEvent);
    socket.on('room.updated', handleRoomEvent);

    socket.on('schedule.created', handleScheduleEvent);
    socket.on('schedule.updated', handleScheduleEvent);
    socket.on('schedule.cancelled', handleScheduleEvent);

    return () => {
      socket.off('notification.created', handleNotifCreated);
      socket.off('notification.updated', handleNotifUpdated);
      socket.off('notification.deleted', handleNotifDeleted);

      socket.off('wallet.updated', handleWalletUpdated);
      socket.off('gift.received', handleGiftReceived);

      socket.off('user.followed', handleUserFollowed);
      socket.off('user.unfollowed', handleUserUnfollowed);

      socket.off('subscriber.created', handleSubscriberCreated);
      socket.off('subscriber.cancelled', handleSubscriberCancelled);

      socket.off('room.created', handleRoomEvent);
      socket.off('room.started', handleRoomEvent);
      socket.off('room.ended', handleRoomEvent);
      socket.off('room.updated', handleRoomEvent);

      socket.off('schedule.created', handleScheduleEvent);
      socket.off('schedule.updated', handleScheduleEvent);
      socket.off('schedule.cancelled', handleScheduleEvent);
    };
  }, [socket, queryClient, showToast, addNotification]);

  return (
    <SocketContext.Provider value={{ socket, status, connect, disconnect, emit }}>
      {children}
    </SocketContext.Provider>
  );
};
