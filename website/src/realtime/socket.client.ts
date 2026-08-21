import { io, type Socket } from 'socket.io-client';
import { useWebsiteAuthStore } from '@/auth/auth.store';

let socket: Socket | null = null;
let authenticated = false;
let authenticationError: Error | null = null;

/**
 * Consumer realtime client. All live-room actions wait for the server's
 * connection_established event, not merely Socket.IO's transport `connect`.
 * This removes the race where presence/reaction commands could run before the
 * async JWT handshake populated client.data.user.
 */
export function getWebsiteSocket(): Socket {
  if (!socket) {
    socket = io('/realtime', {
      path: '/socket.io',
      autoConnect: false,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 8,
      reconnectionDelay: 700,
      reconnectionDelayMax: 5_000,
    });
    socket.on('connection_established', () => {
      authenticated = true;
      authenticationError = null;
    });
    socket.on('auth_error', (payload: any) => {
      authenticated = false;
      authenticationError = new Error(payload?.message || 'Realtime authentication failed');
    });
    socket.on('disconnect', () => {
      authenticated = false;
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

export async function waitForWebsiteSocketReady(): Promise<Socket> {
  const activeSocket = connectWebsiteSocket();
  if (activeSocket.connected && authenticated) return activeSocket;
  if (authenticationError) throw authenticationError;

  await new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error('Realtime authentication timed out'));
    }, 8_000);
    const ready = () => { cleanup(); resolve(); };
    const authFailed = (payload: any) => {
      cleanup();
      reject(new Error(payload?.message || 'Realtime authentication failed'));
    };
    const connectFailed = (error: Error) => { cleanup(); reject(error); };
    const cleanup = () => {
      window.clearTimeout(timer);
      activeSocket.off('connection_established', ready);
      activeSocket.off('auth_error', authFailed);
      activeSocket.off('connect_error', connectFailed);
    };
    activeSocket.on('connection_established', ready);
    activeSocket.on('auth_error', authFailed);
    activeSocket.on('connect_error', connectFailed);
    if (activeSocket.connected && authenticated) {
      cleanup();
      resolve();
    }
  });
  return activeSocket;
}

export function disconnectWebsiteSocket(): void {
  if (socket?.connected) socket.disconnect();
  authenticated = false;
  authenticationError = null;
}
