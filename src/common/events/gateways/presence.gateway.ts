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
import { PresenceJoinDto, PresenceLeaveDto, TypingStatusDto } from '../dto/socket-payloads.dto';
import { RedisStateService } from '../../../redis/redis-state.service';

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
          this.server.to(messageData.roomId).emit(messageData.event, messageData.payload);
        }
      });
    }
  }

  private resolveUserId(client: Socket, payload?: any): string {
    if (client.data?.user?.userId) return client.data.user.userId;
    if (client.data?.userId) return client.data.userId;
    if (payload?.userId) return payload.userId;
    if (client.handshake?.auth?.userId) return client.handshake.auth.userId;
    if (client.handshake?.query?.userId && typeof client.handshake.query.userId === 'string') {
      return client.handshake.query.userId;
    }
    return '11111111-1111-1111-1111-111111111111';
  }

  @SubscribeMessage('presence:join')
  @SubscribeMessage('join_room')
  async handleJoinPresence(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: PresenceJoinDto,
  ) {
    const userId = this.resolveUserId(client, data);
    if (!data?.roomId) {
      return { success: false, error: 'ROOM_NOT_FOUND', message: 'Room ID is required' };
    }

    void client.join(data.roomId);
    const res = await this.roomStateService.addParticipant(
      data.roomId,
      userId,
      client.id,
      data.username,
    );

    const userJoinedPayload = {
      roomId: data.roomId,
      userId,
      username: data.username,
      socketId: client.id,
      timestamp: new Date().toISOString(),
    };

    const presenceUpdatedPayload = {
      roomId: data.roomId,
      participantCount: res.participantCount,
    };

    this.server.to(data.roomId).emit('user_joined', userJoinedPayload);
    this.server.to(data.roomId).emit('presence_updated', presenceUpdatedPayload);

    void this.redisStateService?.publishEvent('user_joined', userJoinedPayload, data.roomId, userId);
    void this.redisStateService?.publishEvent('presence_updated', presenceUpdatedPayload, data.roomId, userId);

    return { success: true, roomId: data.roomId, participantCount: res.participantCount };
  }

  @SubscribeMessage('presence:leave')
  @SubscribeMessage('leave_room')
  async handleLeavePresence(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: PresenceLeaveDto,
  ) {
    const userId = this.resolveUserId(client, data);
    if (!data?.roomId) {
      return { success: false, error: 'ROOM_NOT_FOUND', message: 'Room ID is required' };
    }

    void client.leave(data.roomId);
    const res = await this.roomStateService.removeParticipant(data.roomId, userId);

    const userLeftPayload = {
      roomId: data.roomId,
      userId,
      timestamp: new Date().toISOString(),
    };

    const presenceUpdatedPayload = {
      roomId: data.roomId,
      participantCount: res.participantCount,
    };

    this.server.to(data.roomId).emit('user_left', userLeftPayload);
    this.server.to(data.roomId).emit('presence_updated', presenceUpdatedPayload);

    void this.redisStateService?.publishEvent('user_left', userLeftPayload, data.roomId, userId);
    void this.redisStateService?.publishEvent('presence_updated', presenceUpdatedPayload, data.roomId, userId);

    return { success: true, roomId: data.roomId, participantCount: res.participantCount };
  }

  @SubscribeMessage('presence:reconnect')
  @SubscribeMessage('user_reconnect')
  async handleReconnect(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; userId?: string },
  ) {
    const userId = this.resolveUserId(client, data);
    if (!data?.roomId) {
      return { success: false, error: 'ROOM_NOT_FOUND', message: 'Room ID is required' };
    }

    void client.join(data.roomId);
    const res = await this.roomStateService.reconnectParticipant(data.roomId, userId, client.id);

    const reconnectPayload = {
      roomId: data.roomId,
      userId,
      socketId: client.id,
      timestamp: new Date().toISOString(),
    };

    this.server.to(data.roomId).emit('user_reconnected', reconnectPayload);
    void this.redisStateService?.publishEvent('user_reconnected', reconnectPayload, data.roomId, userId);

    return { success: true, roomId: data.roomId, participantCount: res.participantCount };
  }

  @SubscribeMessage('chat:typing')
  @SubscribeMessage('user_typing')
  async handleTypingStatus(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: TypingStatusDto,
  ) {
    const userId = this.resolveUserId(client, data);
    if (!data?.roomId) {
      return { success: false, error: 'ROOM_NOT_FOUND', message: 'Room ID is required' };
    }

    await this.roomStateService.setTypingStatus(data.roomId, userId, !!data.isTyping);

    const typingPayload = {
      roomId: data.roomId,
      userId,
      isTyping: !!data.isTyping,
      timestamp: Date.now(),
    };

    this.server.to(data.roomId).emit('user_typing', typingPayload);
    void this.redisStateService?.publishEvent('user_typing', typingPayload, data.roomId, userId);

    return { success: true };
  }

  @SubscribeMessage('presence:ping')
  @SubscribeMessage('heartbeat')
  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket, @MessageBody() data?: any) {
    const userId = this.resolveUserId(client, data);
    void this.redisStateService?.updateHeartbeat(userId, data?.roomId);
    return {
      success: true,
      timestamp: Date.now(),
      clientTimestamp: data?.timestamp,
      pong: true,
    };
  }

  @SubscribeMessage('presence:count')
  @SubscribeMessage('get_participant_count')
  async handleGetParticipantCount(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    if (!data?.roomId) {
      return { success: false, error: 'ROOM_NOT_FOUND', message: 'Room ID is required' };
    }
    const count = await this.roomStateService.getParticipantCount(data.roomId);
    return { success: true, roomId: data.roomId, participantCount: count };
  }
}
