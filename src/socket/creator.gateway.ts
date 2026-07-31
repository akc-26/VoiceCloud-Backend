import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { JwtTokenService } from '../modules/auth/jwt-token.service';

export interface CreatorSocketUser {
  userId: string;
  creatorId: string;
  email?: string;
  username?: string;
  role?: string;
}

export interface RealtimeEventPayload<T = any> {
  id: string;
  type: string;
  timestamp: string;
  data: T;
}

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/creator',
})
@Injectable()
export class CreatorGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(CreatorGateway.name);

  constructor(private readonly jwtTokenService: JwtTokenService) {}

  afterInit(server: Server) {
    this.logger.log(
      'Creator Studio Realtime Gateway initialized on namespace /creator',
    );
  }

  /**
   * Handshake authentication and room joining.
   * Extracts JWT token from Authorization header, auth object, or query param.
   */
  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);
      if (!token) {
        if (process.env.NODE_ENV !== 'production') {
          this.logger.warn(
            `[AuthDebug] Unauthorized socket connection attempt (${client.id}): Token missing`,
          );
        }
        client.emit('auth_error', { message: 'Authentication token required' });
        client.disconnect(true);
        return;
      }

      const payload = await this.jwtTokenService.verifyAccessToken(token);
      const userId = payload.userId || payload.sub;
      const creatorId = payload.creatorId || userId;

      const user: CreatorSocketUser = {
        userId,
        creatorId,
        email: payload.email,
        username: payload.username,
        role: payload.role || 'CREATOR',
      };

      client.data.user = user;

      // Automatically join logical rooms for reconnect safety and targeted broadcasting
      void client.join(`user:${userId}`);
      void client.join(`creator:${creatorId}`);

      if (process.env.NODE_ENV !== 'production') {
        this.logger.log(
          `[AuthDebug] Creator socket connected: ${client.id} (sub=${userId}, creatorId=${creatorId}, jti=${payload.jti})`,
        );
      }

      client.emit('connection_established', {
        status: 'connected',
        socketId: client.id,
        user,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      if (process.env.NODE_ENV !== 'production') {
        this.logger.warn(
          `[AuthDebug] Creator socket auth failed (${client.id}): ${err?.message || err}`,
        );
      }
      client.emit('auth_error', { message: err?.message || 'Invalid or expired JWT token' });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const user = client.data?.user as CreatorSocketUser | undefined;
    if (process.env.NODE_ENV !== 'production') {
      this.logger.log(
        `[AuthDebug] Creator socket disconnected: ${client.id} ${
          user ? `(userId: ${user.userId})` : ''
        }`,
      );
    }
  }

  private extractToken(client: Socket): string | null {
    const authHeader = client.handshake.headers?.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7).trim();
    }
    if (client.handshake.auth?.token) {
      const token = client.handshake.auth.token;
      return token.startsWith('Bearer ') ? token.substring(7).trim() : token;
    }
    if (
      client.handshake.query?.token &&
      typeof client.handshake.query.token === 'string'
    ) {
      const token = client.handshake.query.token;
      return token.startsWith('Bearer ') ? token.substring(7).trim() : token;
    }
    return null;
  }

  // --- Realtime Event Emission Methods ---

  /** Emit notification event to specific user room */
  emitNotification(
    userId: string,
    event:
      'notification.created' | 'notification.updated' | 'notification.deleted',
    data: any,
  ) {
    this.logger.log(`Emitting ${event} to user:${userId}`);
    this.server?.to(`user:${userId}`).emit(event, {
      id: data?.id || `notif_${Date.now()}`,
      event,
      timestamp: new Date().toISOString(),
      data,
    });
  }

  /** Emit wallet update to specific user room */
  emitWalletUpdated(userId: string, data: any) {
    this.logger.log(`Emitting wallet.updated to user:${userId}`);
    this.server?.to(`user:${userId}`).emit('wallet.updated', {
      event: 'wallet.updated',
      timestamp: new Date().toISOString(),
      data,
    });
  }

  /** Emit gift received event to creator room */
  emitGiftReceived(creatorId: string, data: any) {
    this.logger.log(`Emitting gift.received to creator:${creatorId}`);
    this.server?.to(`creator:${creatorId}`).emit('gift.received', {
      event: 'gift.received',
      timestamp: new Date().toISOString(),
      data,
    });
  }

  /** Emit follower events to creator room */
  emitFollowerEvent(
    creatorId: string,
    event: 'user.followed' | 'user.unfollowed',
    data: any,
  ) {
    this.logger.log(`Emitting ${event} to creator:${creatorId}`);
    this.server?.to(`creator:${creatorId}`).emit(event, {
      event,
      timestamp: new Date().toISOString(),
      data,
    });
  }

  /** Emit subscriber events to creator room */
  emitSubscriberEvent(
    creatorId: string,
    event: 'subscriber.created' | 'subscriber.cancelled',
    data: any,
  ) {
    this.logger.log(`Emitting ${event} to creator:${creatorId}`);
    this.server?.to(`creator:${creatorId}`).emit(event, {
      event,
      timestamp: new Date().toISOString(),
      data,
    });
  }

  /** Emit room events to creator room */
  emitRoomEvent(
    creatorId: string,
    event: 'room.created' | 'room.started' | 'room.ended' | 'room.updated',
    data: any,
  ) {
    this.logger.log(`Emitting ${event} to creator:${creatorId}`);
    this.server?.to(`creator:${creatorId}`).emit(event, {
      event,
      timestamp: new Date().toISOString(),
      data,
    });
  }

  /** Emit schedule events to creator room */
  emitScheduleEvent(
    creatorId: string,
    event: 'schedule.created' | 'schedule.updated' | 'schedule.cancelled',
    data: any,
  ) {
    this.logger.log(`Emitting ${event} to creator:${creatorId}`);
    this.server?.to(`creator:${creatorId}`).emit(event, {
      event,
      timestamp: new Date().toISOString(),
      data,
    });
  }

  // --- Client Message Subscriptions ---

  @SubscribeMessage('ping')
  @SubscribeMessage('heartbeat')
  handlePing(@ConnectedSocket() client: Socket, @MessageBody() data?: any) {
    return {
      success: true,
      pong: true,
      timestamp: Date.now(),
      clientTimestamp: data?.timestamp,
    };
  }

  @SubscribeMessage('join_room')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { room: string },
  ) {
    if (data?.room) {
      void client.join(data.room);
      return { success: true, room: data.room };
    }
    return { success: false, error: 'Room name required' };
  }

  @SubscribeMessage('leave_room')
  handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { room: string },
  ) {
    if (data?.room) {
      void client.leave(data.room);
      return { success: true, room: data.room };
    }
    return { success: false, error: 'Room name required' };
  }
}
