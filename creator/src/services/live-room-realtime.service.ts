import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/auth.store';

export interface CreatorRoomRealtime {
  socket: Socket;
  ready(): Promise<void>;
  join(roomId: string, username?: string): Promise<void>;
  leave(roomId: string): Promise<void>;
  disconnect(): void;
}

function emitAck(socket: Socket, event: string, payload: unknown): Promise<any> {
  return new Promise((resolve, reject) => {
    socket.timeout(8000).emit(event, payload, (error: Error | null, response: any) => {
      if (error) return reject(error);
      if (response?.success === false) {
        return reject(new Error(response?.message || response?.error || `${event} failed`));
      }
      resolve(response);
    });
  });
}

export function connectCreatorRoomRealtime(): CreatorRoomRealtime {
  const auth = useAuthStore.getState();
  const token = auth.accessToken || auth.token;
  if (!token) throw new Error('Creator authentication is required for live-room realtime');

  let authenticated = false;
  let authError: Error | null = null;
  const socket = io(`${window.location.origin}/realtime`, {
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    auth: { token: `Bearer ${token}` },
    extraHeaders: { Authorization: `Bearer ${token}` },
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1200,
  });

  socket.on('connection_established', () => {
    authenticated = true;
    authError = null;
  });
  socket.on('auth_error', (payload: any) => {
    authenticated = false;
    authError = new Error(payload?.message || 'Creator realtime authentication failed');
  });
  socket.on('disconnect', () => {
    authenticated = false;
  });

  const ready = async () => {
    if (socket.connected && authenticated) return;
    if (authError) throw authError;
    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => {
        cleanup();
        reject(new Error('Creator realtime authentication timed out'));
      }, 9000);
      const established = () => { cleanup(); resolve(); };
      const failed = (payload: any) => {
        cleanup();
        reject(new Error(payload?.message || 'Creator realtime authentication failed'));
      };
      const connectFailed = (error: Error) => { cleanup(); reject(error); };
      const cleanup = () => {
        window.clearTimeout(timer);
        socket.off('connection_established', established);
        socket.off('auth_error', failed);
        socket.off('connect_error', connectFailed);
      };
      socket.on('connection_established', established);
      socket.on('auth_error', failed);
      socket.on('connect_error', connectFailed);
      if (!socket.connected) socket.connect();
      if (socket.connected && authenticated) {
        cleanup();
        resolve();
      }
    });
  };

  return {
    socket,
    ready,
    async join(roomId: string, username?: string) {
      await ready();
      await emitAck(socket, 'presence:join', { roomId, username });
    },
    async leave(roomId: string) {
      if (!socket.connected || !authenticated) return;
      await emitAck(socket, 'presence:leave', { roomId });
    },
    disconnect() {
      socket.removeAllListeners();
      socket.disconnect();
    },
  };
}
