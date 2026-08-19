import { io, type Socket } from 'socket.io-client';
import { useWebsiteAuthStore } from '@/auth/auth.store';

let socket: Socket | null = null;

export function getWebsiteSocket(): Socket {
  if (!socket) {
    socket = io('/', {
      path: '/socket.io',
      autoConnect: false,
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}

export function connectWebsiteSocket(): Socket {
  const activeSocket = getWebsiteSocket();
  const token = useWebsiteAuthStore.getState().accessToken;
  activeSocket.auth = token ? { token } : {};
  if (!activeSocket.connected) activeSocket.connect();
  return activeSocket;
}

export function disconnectWebsiteSocket(): void {
  if (socket?.connected) socket.disconnect();
}
