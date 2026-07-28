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
  SpeakerQueueJoinDto,
  SpeakerQueueLeaveDto,
  SpeakerQueueReorderDto,
  StageInviteDto,
  StageAcceptInvitationDto,
  StageRejectInvitationDto,
  StagePromoteDto,
  StageDemoteDto,
  StageRemoveDto,
  StageMuteDto,
  StageUnmuteDto,
  UpdateRoomTopicDto,
} from '../dto/socket-payloads.dto';
import { RedisStateService } from '../../../redis/redis-state.service';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/realtime',
})
@Injectable()
export class RoomGateway implements OnGatewayInit {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RoomGateway.name);

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

  // --- Speaker Queue ---

  @SubscribeMessage('queue:join')
  @SubscribeMessage('join_speaker_queue')
  async handleJoinQueue(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SpeakerQueueJoinDto,
  ) {
    const userId = this.resolveUserId(client, data);
    try {
      const res = await this.roomStateService.joinQueue(data.roomId, userId, data.username);
      const payload = {
        roomId: data.roomId,
        queue: res.queue,
        count: res.queue.length,
      };
      this.server.to(data.roomId).emit('speaker_queue_updated', payload);
      void this.redisStateService?.publishEvent('speaker_queue_updated', payload, data.roomId, userId);

      return { success: true, position: res.position, queue: res.queue };
    } catch (err: any) {
      return { success: false, error: err.code || 'JOIN_QUEUE_FAILED', message: err.message };
    }
  }

  @SubscribeMessage('queue:leave')
  @SubscribeMessage('leave_speaker_queue')
  async handleLeaveQueue(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SpeakerQueueLeaveDto,
  ) {
    const userId = this.resolveUserId(client, data);
    try {
      const res = await this.roomStateService.leaveQueue(data.roomId, userId);
      const payload = {
        roomId: data.roomId,
        queue: res.queue,
        count: res.queue.length,
      };
      this.server.to(data.roomId).emit('speaker_queue_updated', payload);
      void this.redisStateService?.publishEvent('speaker_queue_updated', payload, data.roomId, userId);

      return { success: true, queue: res.queue };
    } catch (err: any) {
      return { success: false, error: err.code || 'LEAVE_QUEUE_FAILED', message: err.message };
    }
  }

  @SubscribeMessage('queue:view')
  @SubscribeMessage('get_speaker_queue')
  async handleViewQueue(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    try {
      const res = await this.roomStateService.getQueue(data.roomId);
      return { success: true, queue: res.queue, count: res.count };
    } catch (err: any) {
      return { success: false, error: err.code || 'VIEW_QUEUE_FAILED', message: err.message };
    }
  }

  @SubscribeMessage('queue:reorder')
  @SubscribeMessage('reorder_speaker_queue')
  async handleReorderQueue(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SpeakerQueueReorderDto,
  ) {
    const userId = this.resolveUserId(client, data);
    try {
      const res = await this.roomStateService.reorderQueue(
        data.roomId,
        userId,
        data.orderedUserIds,
      );
      const payload = {
        roomId: data.roomId,
        queue: res.queue,
        count: res.queue.length,
      };
      this.server.to(data.roomId).emit('speaker_queue_updated', payload);
      void this.redisStateService?.publishEvent('speaker_queue_updated', payload, data.roomId, userId);

      return { success: true, queue: res.queue };
    } catch (err: any) {
      return { success: false, error: err.code || 'REORDER_QUEUE_FAILED', message: err.message };
    }
  }

  // --- Stage Management ---

  @SubscribeMessage('stage:invite')
  @SubscribeMessage('invite_speaker')
  async handleInviteSpeaker(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: StageInviteDto,
  ) {
    const userId = this.resolveUserId(client, data);
    try {
      const res = await this.roomStateService.inviteSpeaker(
        data.roomId,
        userId,
        data.targetUserId,
      );
      const payload = {
        roomId: data.roomId,
        targetUserId: data.targetUserId,
        invitedBy: userId,
      };
      this.server.to(data.roomId).emit('speaker_invitation_sent', payload);
      void this.redisStateService?.publishEvent('speaker_invitation_sent', payload, data.roomId, userId);

      return { success: true, targetUserId: res.targetUserId, invitedBy: res.invitedBy };
    } catch (err: any) {
      return { success: false, error: err.code || 'INVITE_FAILED', message: err.message };
    }
  }

  @SubscribeMessage('stage:accept_invitation')
  @SubscribeMessage('accept_speaker_invitation')
  async handleAcceptInvitation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: StageAcceptInvitationDto,
  ) {
    const userId = this.resolveUserId(client, data);
    try {
      const res = await this.roomStateService.acceptInvitation(data.roomId, userId);
      const stagePayload = {
        roomId: data.roomId,
        speakers: res.speakers,
      };
      const promotedPayload = {
        roomId: data.roomId,
        targetUserId: userId,
        role: res.speaker.role,
      };

      this.server.to(data.roomId).emit('stage_updated', stagePayload);
      this.server.to(data.roomId).emit('speaker_promoted', promotedPayload);

      void this.redisStateService?.publishEvent('stage_updated', stagePayload, data.roomId, userId);
      void this.redisStateService?.publishEvent('speaker_promoted', promotedPayload, data.roomId, userId);

      return { success: true, speaker: res.speaker };
    } catch (err: any) {
      return { success: false, error: err.code || 'ACCEPT_INVITATION_FAILED', message: err.message };
    }
  }

  @SubscribeMessage('stage:reject_invitation')
  @SubscribeMessage('reject_speaker_invitation')
  async handleRejectInvitation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: StageRejectInvitationDto,
  ) {
    const userId = this.resolveUserId(client, data);
    try {
      await this.roomStateService.rejectInvitation(data.roomId, userId);
      const payload = {
        roomId: data.roomId,
        targetUserId: userId,
      };
      this.server.to(data.roomId).emit('speaker_invitation_rejected', payload);
      void this.redisStateService?.publishEvent('speaker_invitation_rejected', payload, data.roomId, userId);

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.code || 'REJECT_INVITATION_FAILED', message: err.message };
    }
  }

  @SubscribeMessage('stage:promote')
  @SubscribeMessage('promote_listener')
  async handlePromoteListener(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: StagePromoteDto,
  ) {
    const userId = this.resolveUserId(client, data);
    try {
      const res = await this.roomStateService.promoteListener(
        data.roomId,
        userId,
        data.targetUserId,
      );
      const stagePayload = {
        roomId: data.roomId,
        speakers: res.speakers,
      };
      const promotedPayload = {
        roomId: data.roomId,
        targetUserId: data.targetUserId,
        role: res.speaker.role,
      };

      this.server.to(data.roomId).emit('stage_updated', stagePayload);
      this.server.to(data.roomId).emit('speaker_promoted', promotedPayload);

      void this.redisStateService?.publishEvent('stage_updated', stagePayload, data.roomId, userId);
      void this.redisStateService?.publishEvent('speaker_promoted', promotedPayload, data.roomId, userId);

      return { success: true, speaker: res.speaker };
    } catch (err: any) {
      return { success: false, error: err.code || 'PROMOTE_FAILED', message: err.message };
    }
  }

  @SubscribeMessage('stage:demote')
  @SubscribeMessage('demote_speaker')
  async handleDemoteSpeaker(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: StageDemoteDto,
  ) {
    const userId = this.resolveUserId(client, data);
    try {
      const res = await this.roomStateService.demoteSpeaker(
        data.roomId,
        userId,
        data.targetUserId,
      );
      const stagePayload = {
        roomId: data.roomId,
        speakers: res.speakers,
      };
      const demotedPayload = {
        roomId: data.roomId,
        targetUserId: data.targetUserId,
        role: 'listener',
      };

      this.server.to(data.roomId).emit('stage_updated', stagePayload);
      this.server.to(data.roomId).emit('speaker_demoted', demotedPayload);

      void this.redisStateService?.publishEvent('stage_updated', stagePayload, data.roomId, userId);
      void this.redisStateService?.publishEvent('speaker_demoted', demotedPayload, data.roomId, userId);

      return { success: true, targetUserId: data.targetUserId };
    } catch (err: any) {
      return { success: false, error: err.code || 'DEMOTE_FAILED', message: err.message };
    }
  }

  @SubscribeMessage('stage:remove')
  @SubscribeMessage('remove_speaker')
  async handleRemoveSpeaker(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: StageRemoveDto,
  ) {
    const userId = this.resolveUserId(client, data);
    try {
      const res = await this.roomStateService.removeSpeaker(
        data.roomId,
        userId,
        data.targetUserId,
      );
      const stagePayload = {
        roomId: data.roomId,
        speakers: res.speakers,
      };
      const removedPayload = {
        roomId: data.roomId,
        targetUserId: data.targetUserId,
      };

      this.server.to(data.roomId).emit('stage_updated', stagePayload);
      this.server.to(data.roomId).emit('speaker_removed', removedPayload);

      void this.redisStateService?.publishEvent('stage_updated', stagePayload, data.roomId, userId);
      void this.redisStateService?.publishEvent('speaker_removed', removedPayload, data.roomId, userId);

      return { success: true, targetUserId: data.targetUserId };
    } catch (err: any) {
      return { success: false, error: err.code || 'REMOVE_FAILED', message: err.message };
    }
  }

  @SubscribeMessage('stage:mute')
  @SubscribeMessage('mute_speaker')
  async handleMuteSpeaker(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: StageMuteDto,
  ) {
    const userId = this.resolveUserId(client, data);
    try {
      const res = await this.roomStateService.setMuteSpeaker(
        data.roomId,
        userId,
        data.targetUserId,
        true,
      );
      const mutedPayload = {
        roomId: data.roomId,
        targetUserId: res.targetUserId,
        isMuted: true,
      };
      const stagePayload = {
        roomId: data.roomId,
        speakers: res.speakers,
      };

      this.server.to(data.roomId).emit('speaker_muted', mutedPayload);
      this.server.to(data.roomId).emit('stage_updated', stagePayload);

      void this.redisStateService?.publishEvent('speaker_muted', mutedPayload, data.roomId, userId);
      void this.redisStateService?.publishEvent('stage_updated', stagePayload, data.roomId, userId);

      return { success: true, targetUserId: res.targetUserId, isMuted: true };
    } catch (err: any) {
      return { success: false, error: err.code || 'MUTE_FAILED', message: err.message };
    }
  }

  @SubscribeMessage('stage:unmute')
  @SubscribeMessage('unmute_speaker')
  async handleUnmuteSpeaker(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: StageUnmuteDto,
  ) {
    const userId = this.resolveUserId(client, data);
    try {
      const res = await this.roomStateService.setMuteSpeaker(
        data.roomId,
        userId,
        data.targetUserId,
        false,
      );
      const unmutedPayload = {
        roomId: data.roomId,
        targetUserId: res.targetUserId,
        isMuted: false,
      };
      const stagePayload = {
        roomId: data.roomId,
        speakers: res.speakers,
      };

      this.server.to(data.roomId).emit('speaker_unmuted', unmutedPayload);
      this.server.to(data.roomId).emit('stage_updated', stagePayload);

      void this.redisStateService?.publishEvent('speaker_unmuted', unmutedPayload, data.roomId, userId);
      void this.redisStateService?.publishEvent('stage_updated', stagePayload, data.roomId, userId);

      return { success: true, targetUserId: res.targetUserId, isMuted: false };
    } catch (err: any) {
      return { success: false, error: err.code || 'UNMUTE_FAILED', message: err.message };
    }
  }

  // --- Room Topic Updates ---

  @SubscribeMessage('room:update_topic')
  @SubscribeMessage('room:update_title')
  @SubscribeMessage('room:update_description')
  @SubscribeMessage('room:update_category')
  @SubscribeMessage('update_room_topic')
  async handleUpdateRoomTopic(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: UpdateRoomTopicDto,
  ) {
    const userId = this.resolveUserId(client, data);
    try {
      const res = await this.roomStateService.updateTopic(
        data.roomId,
        userId,
        data.title,
        data.description,
        data.category,
      );
      this.server.to(data.roomId).emit('room_topic_updated', res);
      void this.redisStateService?.publishEvent('room_topic_updated', res, data.roomId, userId);

      return { success: true, ...res };
    } catch (err: any) {
      return { success: false, error: err.code || 'UPDATE_TOPIC_FAILED', message: err.message };
    }
  }
}
