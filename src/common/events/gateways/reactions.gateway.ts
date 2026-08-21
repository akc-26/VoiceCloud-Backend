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
import { EmojiReactionDto, SendGiftEventDto } from '../dto/socket-payloads.dto';
import { SocketErrorCode } from '../constants/socket-error-codes.enum';
import { RedisStateService } from '../../../redis/redis-state.service';
import { RealtimeSocketAuthService } from '../services/realtime-socket-auth.service';
import { RealtimeRoomStateService } from '../services/realtime-room-state.service';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/realtime',
})
@Injectable()
export class ReactionsGateway implements OnGatewayInit {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ReactionsGateway.name);

  private readonly EMOJI_REGEX =
    /^(\p{Extended_Pictographic}|\p{Emoji_Presentation})+$/u;

  constructor(
    private readonly socketAuthService: RealtimeSocketAuthService,
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
          this.server
            .to(messageData.roomId)
            .emit(messageData.event, messageData.payload);
        }
      });
    }
  }

  // --- Live Emoji Reactions ---

  @SubscribeMessage('reaction:send')
  @SubscribeMessage('send_emoji_reaction')
  @SubscribeMessage('emoji_reaction')
  async handleSendEmojiReaction(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: EmojiReactionDto,
  ) {
    let userId: string;
    let username: string | undefined;
    try {
      const authenticatedUser = await this.socketAuthService.ensureAuthenticatedUser(client);
      userId = authenticatedUser.userId;
      username = authenticatedUser.username;
    } catch (error) {
      return this.toFailure(error, SocketErrorCode.UNAUTHORIZED);
    }

    if (!data?.roomId) {
      return {
        success: false,
        error: SocketErrorCode.ROOM_NOT_FOUND,
        message: 'Room ID is required',
      };
    }

    try {
      await this.roomStateService.assertRoomJoinable(data.roomId, userId);
      await this.roomStateService.assertRoomInteractive(data.roomId);
      this.socketAuthService.assertJoinedRoom(client, data.roomId);
      await this.roomStateService.assertParticipantOrHost(data.roomId, userId);
    } catch (error) {
      return this.toFailure(error, SocketErrorCode.NOT_IN_ROOM);
    }

    if (!data.emoji || !this.EMOJI_REGEX.test(data.emoji.trim())) {
      return {
        success: false,
        error: SocketErrorCode.INVALID_EMOJI,
        message: 'Invalid emoji reaction provided',
      };
    }

    const payload = {
      roomId: data.roomId,
      userId,
      username: username || 'VoiceCloud user',
      emoji: data.emoji.trim(),
      timestamp: new Date().toISOString(),
    };

    // Broadcast locally
    this.server.to(data.roomId).emit('emoji_reaction_received', payload);
    this.server.to(data.roomId).emit('reaction:broadcast', payload);

    // Broadcast across instances via Redis Pub/Sub
    void this.redisStateService?.publishEvent(
      'emoji_reaction_received',
      payload,
      data.roomId,
      userId,
    );
    void this.redisStateService?.publishEvent(
      'reaction:broadcast',
      payload,
      data.roomId,
      userId,
    );

    return { success: true, emoji: data.emoji.trim(), reaction: payload };
  }

  // --- Gift Broadcast Events (Display Only) ---

  @SubscribeMessage('gift:send')
  @SubscribeMessage('send_gift')
  async handleSendGiftEvent(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SendGiftEventDto,
  ) {
    let senderId: string;
    try {
      senderId = (await this.socketAuthService.ensureAuthenticatedUser(client)).userId;
    } catch (error) {
      return this.toFailure(error, SocketErrorCode.UNAUTHORIZED);
    }

    if (!data?.roomId) {
      return {
        success: false,
        error: SocketErrorCode.ROOM_NOT_FOUND,
        message: 'Room ID is required',
      };
    }

    try {
      await this.roomStateService.assertRoomJoinable(data.roomId, senderId);
      this.socketAuthService.assertJoinedRoom(client, data.roomId);
      await this.roomStateService.assertParticipantOrHost(
        data.roomId,
        senderId,
      );
    } catch (error) {
      return this.toFailure(error, SocketErrorCode.NOT_IN_ROOM);
    }

    const timestamp = new Date().toISOString();
    const giftName = data.giftName || 'Virtual Gift';
    const coinValue = data.coinValue ?? 100;

    const basePayload = {
      roomId: data.roomId,
      senderId,
      recipientId: data.recipientId,
      giftId: data.giftId,
      giftName,
      giftCategory: data.giftCategory || 'Standard',
      coinValue,
      timestamp,
    };

    const animPayload = {
      roomId: data.roomId,
      giftId: data.giftId,
      giftName,
      animationUrl:
        data.animationUrl ||
        `https://assets.voicecloud.com/gifts/anim_${data.giftId}.json`,
      senderId,
      recipientId: data.recipientId,
      timestamp,
    };

    // 1. Broadcast gift.sent
    this.server.to(data.roomId).emit('gift.sent', basePayload);
    void this.redisStateService?.publishEvent(
      'gift.sent',
      basePayload,
      data.roomId,
      senderId,
    );

    // 2. Broadcast gift.received
    this.server.to(data.roomId).emit('gift.received', basePayload);
    void this.redisStateService?.publishEvent(
      'gift.received',
      basePayload,
      data.roomId,
      senderId,
    );

    // 3. Broadcast gift.animation
    this.server.to(data.roomId).emit('gift.animation', animPayload);
    void this.redisStateService?.publishEvent(
      'gift.animation',
      animPayload,
      data.roomId,
      senderId,
    );

    this.logger.log(
      `Broadcasted gift event for gift ${data.giftId} in room ${data.roomId} from ${senderId} to ${data.recipientId}`,
    );

    return { success: true, giftId: data.giftId, status: 'broadcasted' };
  }

  private toFailure(error: unknown, fallbackCode: string) {
    const candidate = error as { code?: string; message?: string };
    return {
      success: false,
      error: candidate?.code || fallbackCode,
      message: candidate?.message || 'Realtime reaction failed',
    };
  }
}
