import { io, Socket } from 'socket.io-client';

export type SocketConnectionStatus = 'connected' | 'connecting' | 'reconnecting' | 'offline';

export type SocketStatusListener = (status: SocketConnectionStatus) => void;

class CreatorSocketService {
  private socket: Socket | null = null;
  private status: SocketConnectionStatus = 'offline';
  private statusListeners: Set<SocketStatusListener> = new Set();
  private reconnectAttempts = 0;

  public getStatus(): SocketConnectionStatus {
    return this.status;
  }

  public getSocket(): Socket | null {
    return this.socket;
  }

  public subscribeStatus(listener: SocketStatusListener): () => void {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  private setStatus(newStatus: SocketConnectionStatus) {
    if (this.status !== newStatus) {
      this.status = newStatus;
      this.statusListeners.forEach((listener) => listener(newStatus));
    }
  }

  public connect(jwtToken?: string): Socket {
    if (this.socket && (this.socket.connected || this.status === 'connecting')) {
      return this.socket;
    }

    let token = jwtToken;
    if (!token) {
      try {
        const storedAuth = localStorage.getItem('voicecloud-creator-auth');
        if (storedAuth) {
          const parsed = JSON.parse(storedAuth);
          token = parsed?.state?.accessToken || parsed?.state?.token;
        }
      } catch {
        // Ignore JSON parse errors
      }
      token =
        token ||
        localStorage.getItem('token') ||
        localStorage.getItem('access_token') ||
        'demo_jwt_creator_token';
    }

    const serverUrl = window.location.origin;

    this.setStatus('connecting');

    this.socket = io(`${serverUrl}/creator`, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      auth: {
        token: `Bearer ${token}`,
      },
      extraHeaders: {
        Authorization: `Bearer ${token}`,
      },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      timeout: 20000,
    });

    this.socket.on('connect', () => {
      this.reconnectAttempts = 0;
      this.setStatus('connected');
      console.log('[CreatorSocket] Connected to /creator namespace with ID:', this.socket?.id);
    });

    this.socket.on('connect_error', (err) => {
      console.warn('[CreatorSocket] Connection error:', err.message);
      if (
        err.message === 'Invalid namespace' ||
        err.message?.includes('namespace') ||
        err.message?.includes('Authentication') ||
        err.message?.includes('token')
      ) {
        console.warn('[CreatorSocket] Realtime authentication unverified or namespace offline. Operating in REST mode.');
        this.setStatus('offline');
        this.socket?.disconnect();
        return;
      }
      if (this.reconnectAttempts > 0) {
        this.setStatus('reconnecting');
      } else {
        this.setStatus('offline');
      }
    });

    this.socket.io.on('reconnect_attempt', (attempt) => {
      this.reconnectAttempts = attempt;
      this.setStatus('reconnecting');
      console.log(`[CreatorSocket] Reconnect attempt #${attempt}`);
    });

    this.socket.io.on('reconnect_failed', () => {
      this.setStatus('offline');
      console.error('[CreatorSocket] Reconnection failed after maximum attempts');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[CreatorSocket] Disconnected:', reason);
      if (reason === 'io server disconnect') {
        // Server disconnected the socket manually, try reconnecting
        this.socket?.connect();
        this.setStatus('connecting');
      } else {
        this.setStatus('offline');
      }
    });

    this.socket.on('auth_error', (data) => {
      console.error('[CreatorSocket] Authentication error:', data?.message);
    });

    return this.socket;
  }

  public disconnect() {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      this.setStatus('offline');
      console.log('[CreatorSocket] Disconnected manually');
    }
  }

  public on(event: string, callback: (data: any) => void): () => void {
    if (!this.socket) {
      this.connect();
    }
    this.socket?.on(event, callback);
    return () => {
      this.socket?.off(event, callback);
    };
  }

  public off(event: string, callback?: (data: any) => void) {
    if (callback) {
      this.socket?.off(event, callback);
    } else {
      this.socket?.off(event);
    }
  }

  public emit(event: string, data?: any): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn(`[CreatorSocket] Cannot emit '${event}': socket is not connected`);
    }
  }
}

export const creatorSocketService = new CreatorSocketService();
