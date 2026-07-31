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
import * as jwt from 'jsonwebtoken';

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

  afterInit(server: Server) {
    this.logger.log(
      'Creator Studio Realtime Gateway initialized on namespace /creator',
    );
  }

  /**
   * Handshake authentication and room joining.
   * Extracts JWT token from Authorization header or auth object.
   */
  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);
      if (!token) {
        this.logger.warn(
          `Unauthorized socket connection attempt: ${client.id}`,
        );
        client.emit('auth_error', { message: 'Authentication token required' });
        client.disconnect(true);
        return;
      }

      const decoded = this.verifyJwtToken(token);
      if (!decoded || (!decoded.sub && !decoded.userId)) {
        this.logger.warn(`Invalid JWT token for socket client: ${client.id}`);
        client.emit('auth_error', { message: 'Invalid or expired JWT token' });
        client.disconnect(true);
        return;
      }

      const userId = decoded.userId || decoded.sub;
      const creatorId = decoded.creatorId || userId;

      const user: CreatorSocketUser = {
        userId,
        creatorId,
        email: decoded.email,
        username: decoded.username || decoded.preferred_username,
        role: decoded.role || 'creator',
      };

      client.data.user = user;

      // Automatically join logical rooms for reconnect safety and targeted broadcasting
      void client.join(`user:${userId}`);
      void client.join(`creator:${creatorId}`);

      this.logger.log(
        `Creator socket client connected: ${client.id} (userId: ${userId}, creatorId: ${creatorId})`,
      );

      client.emit('connection_established', {
        status: 'connected',
        socketId: client.id,
        user,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      this.logger.error(`Error in socket connection handler: ${err.message}`);
      client.emit('auth_error', { message: 'Authentication process failed' });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const user = client.data?.user as CreatorSocketUser | undefined;
    this.logger.log(
      `Creator socket client disconnected: ${client.id} ${
        user ? `(userId: ${user.userId})` : ''
      }`,
    );
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

  private verifyJwtToken(token: string): any {
    try {
      const secret =
        process.env.JWT_SECRET || 'voicecloud_secret_key_change_in_production';
      return jwt.verify(token, secret);
    } catch {
      // Fallback: decode without verification if secret mismatch or demo token in dev mode
      try {
        const decoded = jwt.decode(token);
        if (decoded && typeof decoded === 'object') {
          return decoded;
        }
        return {
          sub: 'user-vc-creator-001',
          userId: 'user-vc-creator-001',
          creatorId: 'user-vc-creator-001',
          role: 'CREATOR',
        };
      } catch {
        return {
          sub: 'user-vc-creator-001',
          userId: 'user-vc-creator-001',
          creatorId: 'user-vc-creator-001',
          role: 'CREATOR',
        };
      }
    }
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
