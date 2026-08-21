import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger, Optional } from '@nestjs/common';
import { RealtimeRoomStateService } from '../services/realtime-room-state.service';
import {
  PresenceJoinDto,
  PresenceLeaveDto,
  TypingStatusDto,
} from '../dto/socket-payloads.dto';
import { RedisStateService } from '../../../redis/redis-state.service';
import { RealtimeSocketAuthService } from '../services/realtime-socket-auth.service';
import { SocketErrorCode } from '../constants/socket-error-codes.enum';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/realtime',
})
@Injectable()
export class PresenceGateway implements OnGatewayInit {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(PresenceGateway.name);

  constructor(
    private readonly roomStateService: RealtimeRoomStateService,
    private readonly socketAuthService: RealtimeSocketAuthService,
    @Optional() private readonly redisStateService?: RedisStateService,
  ) {}

  afterInit() {
    if (this.redisStateService) {
      this.redisStateService.subscribeToEvents((event, messageData) => {
        if (
          messageData.originNodeId !== this.redisStateService?.nodeId &&
          messageData.roomId &&
          this.server
        ) {
          this.server
            .to(messageData.roomId)
            .emit(messageData.event, messageData.payload);
        }
      });
    }
  }

  @SubscribeMessage('presence:join')
  @SubscribeMessage('join_room')
  async handleJoinPresence(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: PresenceJoinDto,
  ) {
    try {
      const user = await this.socketAuthService.ensureAuthenticatedUser(client);
      if (!data?.roomId) {
        return this.failure(SocketErrorCode.ROOM_NOT_FOUND, 'Room ID is required');
      }

      await this.roomStateService.assertRoomJoinable(
        data.roomId,
        user.userId,
      );

      const result = await this.roomStateService.addParticipant(
        data.roomId,
        user.userId,
        client.id,
        data.username || user.username,
      );
      try {
        await client.join(data.roomId);
        await client.join(`user:${user.userId}`);
        this.trackJoinedRoom(client, data.roomId);
      } catch (error) {
        await this.roomStateService.removeParticipant(
          data.roomId,
          user.userId,
          client.id,
        );
        throw error;
      }

      const userJoinedPayload = {
        roomId: data.roomId,
        userId: user.userId,
        username: data.username || user.username,
        socketId: client.id,
        timestamp: new Date().toISOString(),
      };
      const presenceUpdatedPayload = {
        roomId: data.roomId,
        participantCount: result.participantCount,
      };

      this.server.to(data.roomId).emit('user_joined', userJoinedPayload);
      this.server
        .to(data.roomId)
        .emit('presence_updated', presenceUpdatedPayload);

      void this.redisStateService?.publishEvent(
        'user_joined',
        userJoinedPayload,
        data.roomId,
        user.userId,
      );
      void this.redisStateService?.publishEvent(
        'presence_updated',
        presenceUpdatedPayload,
        data.roomId,
        user.userId,
      );

      return {
        success: true,
        roomId: data.roomId,
        participantCount: result.participantCount,
      };
    } catch (error) {
      return this.toFailure(error, 'JOIN_ROOM_FAILED');
    }
  }

  @SubscribeMessage('presence:leave')
  @SubscribeMessage('leave_room')
  async handleLeavePresence(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: PresenceLeaveDto,
  ) {
    try {
      const user = await this.socketAuthService.ensureAuthenticatedUser(client);
      if (!data?.roomId) {
        return this.failure(SocketErrorCode.ROOM_NOT_FOUND, 'Room ID is required');
      }

      this.socketAuthService.assertJoinedRoom(client, data.roomId);
      await client.leave(data.roomId);
      this.untrackJoinedRoom(client, data.roomId);
      const result = await this.roomStateService.removeParticipant(
        data.roomId,
        user.userId,
        client.id,
      );

      const userLeftPayload = {
        roomId: data.roomId,
        userId: user.userId,
        timestamp: new Date().toISOString(),
      };
      const presenceUpdatedPayload = {
        roomId: data.roomId,
        participantCount: result.participantCount,
      };

      this.server.to(data.roomId).emit('user_left', userLeftPayload);
      this.server
        .to(data.roomId)
        .emit('presence_updated', presenceUpdatedPayload);

      void this.redisStateService?.publishEvent(
        'user_left',
        userLeftPayload,
        data.roomId,
        user.userId,
      );
      void this.redisStateService?.publishEvent(
        'presence_updated',
        presenceUpdatedPayload,
        data.roomId,
        user.userId,
      );

      return {
        success: true,
        roomId: data.roomId,
        participantCount: result.participantCount,
      };
    } catch (error) {
      return this.toFailure(error, 'LEAVE_ROOM_FAILED');
    }
  }

  @SubscribeMessage('presence:reconnect')
  @SubscribeMessage('user_reconnect')
  async handleReconnect(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    try {
      const user = await this.socketAuthService.ensureAuthenticatedUser(client);
      if (!data?.roomId) {
        return this.failure(SocketErrorCode.ROOM_NOT_FOUND, 'Room ID is required');
      }

      await this.roomStateService.assertRoomJoinable(
        data.roomId,
        user.userId,
      );
      const result = await this.roomStateService.reconnectParticipant(
        data.roomId,
        user.userId,
        client.id,
      );
      try {
        await client.join(data.roomId);
        await client.join(`user:${user.userId}`);
        this.trackJoinedRoom(client, data.roomId);
      } catch (error) {
        await this.roomStateService.removeParticipant(
          data.roomId,
          user.userId,
          client.id,
        );
        throw error;
      }

      const reconnectPayload = {
        roomId: data.roomId,
        userId: user.userId,
        socketId: client.id,
        timestamp: new Date().toISOString(),
      };

      this.server.to(data.roomId).emit('user_reconnected', reconnectPayload);
      void this.redisStateService?.publishEvent(
        'user_reconnected',
        reconnectPayload,
        data.roomId,
        user.userId,
      );

      return {
        success: true,
        roomId: data.roomId,
        participantCount: result.participantCount,
      };
    } catch (error) {
      return this.toFailure(error, 'RECONNECT_FAILED');
    }
  }

  @SubscribeMessage('chat:typing')
  @SubscribeMessage('user_typing')
  async handleTypingStatus(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: TypingStatusDto,
  ) {
    try {
      const user = await this.socketAuthService.ensureAuthenticatedUser(client);
      if (!data?.roomId) {
        return this.failure(SocketErrorCode.ROOM_NOT_FOUND, 'Room ID is required');
      }
      await this.roomStateService.assertRoomJoinable(
        data.roomId,
        user.userId,
      );
      this.socketAuthService.assertJoinedRoom(client, data.roomId);
      await this.roomStateService.assertParticipantOrHost(
        data.roomId,
        user.userId,
      );
      await this.roomStateService.setTypingStatus(
        data.roomId,
        user.userId,
        !!data.isTyping,
      );

      const typingPayload = {
        roomId: data.roomId,
        userId: user.userId,
        isTyping: !!data.isTyping,
        timestamp: Date.now(),
      };

      this.server.to(data.roomId).emit('user_typing', typingPayload);
      void this.redisStateService?.publishEvent(
        'user_typing',
        typingPayload,
        data.roomId,
        user.userId,
      );
      return { success: true };
    } catch (error) {
      return this.toFailure(error, 'TYPING_STATUS_FAILED');
    }
  }

  @SubscribeMessage('presence:ping')
  @SubscribeMessage('heartbeat')
  @SubscribeMessage('ping')
  async handlePing(@ConnectedSocket() client: Socket, @MessageBody() data?: any) {
    try {
      const user = await this.socketAuthService.ensureAuthenticatedUser(client);
      if (data?.roomId) {
        this.socketAuthService.assertJoinedRoom(client, data.roomId);
      }
      void this.redisStateService?.updateHeartbeat(user.userId, data?.roomId);
      return {
        success: true,
        timestamp: Date.now(),
        clientTimestamp: data?.timestamp,
        pong: true,
      };
    } catch (error) {
      return this.toFailure(error, SocketErrorCode.UNAUTHORIZED);
    }
  }

  @SubscribeMessage('presence:count')
  @SubscribeMessage('get_participant_count')
  async handleGetParticipantCount(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    try {
      const user = await this.socketAuthService.ensureAuthenticatedUser(client);
      if (!data?.roomId) {
        return this.failure(SocketErrorCode.ROOM_NOT_FOUND, 'Room ID is required');
      }
      await this.roomStateService.assertRoomJoinable(data.roomId, user.userId);
      this.socketAuthService.assertJoinedRoom(client, data.roomId);
      await this.roomStateService.assertParticipantOrHost(
        data.roomId,
        user.userId,
      );
      const count = await this.roomStateService.getParticipantCount(data.roomId);
      return { success: true, roomId: data.roomId, participantCount: count };
    } catch (error) {
      return this.toFailure(error, 'PARTICIPANT_COUNT_FAILED');
    }
  }

  private trackJoinedRoom(client: Socket, roomId: string): void {
    const rooms =
      (client.data.joinedRoomIds as Set<string> | undefined) ?? new Set<string>();
    rooms.add(roomId);
    client.data.joinedRoomIds = rooms;
  }

  private untrackJoinedRoom(client: Socket, roomId: string): void {
    const rooms = client.data.joinedRoomIds as Set<string> | undefined;
    rooms?.delete(roomId);
  }

  private failure(error: string, message: string) {
    return { success: false, error, message };
  }

  private toFailure(error: unknown, fallbackCode: string) {
    const candidate = error as { code?: string; message?: string };
    return this.failure(
      candidate?.code || fallbackCode,
      candidate?.message || 'Realtime room operation failed',
    );
  }
}
