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
  RoomAudienceModerationDto,
} from '../dto/socket-payloads.dto';
import { RedisStateService } from '../../../redis/redis-state.service';
import { RealtimeSocketAuthService } from '../services/realtime-socket-auth.service';

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

  private resolveUserId(client: Socket): string {
    return this.socketAuthService.getAuthenticatedUser(client).userId;
  }

  private async assertRoomAccess(
    client: Socket,
    roomId: string,
  ): Promise<void> {
    const userId = this.resolveUserId(client);
    await this.roomStateService.assertRoomJoinable(roomId, userId);
    this.socketAuthService.assertJoinedRoom(client, roomId);
    await this.roomStateService.assertParticipantOrHost(roomId, userId);
  }

  // --- Speaker Queue ---

  @SubscribeMessage('queue:join')
  @SubscribeMessage('join_speaker_queue')
  async handleJoinQueue(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SpeakerQueueJoinDto,
  ) {
    try {
      const userId = this.resolveUserId(client);
      await this.assertRoomAccess(client, data.roomId);
      const res = await this.roomStateService.joinQueue(
        data.roomId,
        userId,
        data.username,
      );
      const payload = {
        roomId: data.roomId,
        queue: res.queue,
        count: res.queue.length,
      };
      this.server.to(data.roomId).emit('speaker_queue_updated', payload);
      void this.redisStateService?.publishEvent(
        'speaker_queue_updated',
        payload,
        data.roomId,
        userId,
      );

      return { success: true, position: res.position, queue: res.queue };
    } catch (err: any) {
      return {
        success: false,
        error: err.code || 'JOIN_QUEUE_FAILED',
        message: err.message,
      };
    }
  }

  @SubscribeMessage('queue:leave')
  @SubscribeMessage('leave_speaker_queue')
  async handleLeaveQueue(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SpeakerQueueLeaveDto,
  ) {
    try {
      const userId = this.resolveUserId(client);
      await this.assertRoomAccess(client, data.roomId);
      const res = await this.roomStateService.leaveQueue(data.roomId, userId);
      const payload = {
        roomId: data.roomId,
        queue: res.queue,
        count: res.queue.length,
      };
      this.server.to(data.roomId).emit('speaker_queue_updated', payload);
      void this.redisStateService?.publishEvent(
        'speaker_queue_updated',
        payload,
        data.roomId,
        userId,
      );

      return { success: true, queue: res.queue };
    } catch (err: any) {
      return {
        success: false,
        error: err.code || 'LEAVE_QUEUE_FAILED',
        message: err.message,
      };
    }
  }

  @SubscribeMessage('queue:view')
  @SubscribeMessage('get_speaker_queue')
  async handleViewQueue(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    try {
      const userId = this.resolveUserId(client);
      await this.assertRoomAccess(client, data.roomId);
      const res = await this.roomStateService.getQueue(data.roomId);
      return { success: true, queue: res.queue, count: res.count };
    } catch (err: any) {
      return {
        success: false,
        error: err.code || 'VIEW_QUEUE_FAILED',
        message: err.message,
      };
    }
  }

  @SubscribeMessage('queue:reorder')
  @SubscribeMessage('reorder_speaker_queue')
  async handleReorderQueue(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SpeakerQueueReorderDto,
  ) {
    try {
      const userId = this.resolveUserId(client);
      await this.assertRoomAccess(client, data.roomId);
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
      void this.redisStateService?.publishEvent(
        'speaker_queue_updated',
        payload,
        data.roomId,
        userId,
      );

      return { success: true, queue: res.queue };
    } catch (err: any) {
      return {
        success: false,
        error: err.code || 'REORDER_QUEUE_FAILED',
        message: err.message,
      };
    }
  }

  // --- Stage Management ---

  @SubscribeMessage('stage:invite')
  @SubscribeMessage('invite_speaker')
  async handleInviteSpeaker(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: StageInviteDto,
  ) {
    try {
      const userId = this.resolveUserId(client);
      await this.assertRoomAccess(client, data.roomId);
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
      void this.redisStateService?.publishEvent(
        'speaker_invitation_sent',
        payload,
        data.roomId,
        userId,
      );

      return {
        success: true,
        targetUserId: res.targetUserId,
        invitedBy: res.invitedBy,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.code || 'INVITE_FAILED',
        message: err.message,
      };
    }
  }

  @SubscribeMessage('stage:accept_invitation')
  @SubscribeMessage('accept_speaker_invitation')
  async handleAcceptInvitation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: StageAcceptInvitationDto,
  ) {
    try {
      const userId = this.resolveUserId(client);
      await this.assertRoomAccess(client, data.roomId);
      const res = await this.roomStateService.acceptInvitation(
        data.roomId,
        userId,
      );
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

      void this.redisStateService?.publishEvent(
        'stage_updated',
        stagePayload,
        data.roomId,
        userId,
      );
      void this.redisStateService?.publishEvent(
        'speaker_promoted',
        promotedPayload,
        data.roomId,
        userId,
      );

      return { success: true, speaker: res.speaker };
    } catch (err: any) {
      return {
        success: false,
        error: err.code || 'ACCEPT_INVITATION_FAILED',
        message: err.message,
      };
    }
  }

  @SubscribeMessage('stage:reject_invitation')
  @SubscribeMessage('reject_speaker_invitation')
  async handleRejectInvitation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: StageRejectInvitationDto,
  ) {
    try {
      const userId = this.resolveUserId(client);
      await this.assertRoomAccess(client, data.roomId);
      await this.roomStateService.rejectInvitation(data.roomId, userId);
      const payload = {
        roomId: data.roomId,
        targetUserId: userId,
      };
      this.server.to(data.roomId).emit('speaker_invitation_rejected', payload);
      void this.redisStateService?.publishEvent(
        'speaker_invitation_rejected',
        payload,
        data.roomId,
        userId,
      );

      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: err.code || 'REJECT_INVITATION_FAILED',
        message: err.message,
      };
    }
  }

  @SubscribeMessage('stage:promote')
  @SubscribeMessage('promote_listener')
  async handlePromoteListener(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: StagePromoteDto,
  ) {
    try {
      const userId = this.resolveUserId(client);
      await this.assertRoomAccess(client, data.roomId);
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

      void this.redisStateService?.publishEvent(
        'stage_updated',
        stagePayload,
        data.roomId,
        userId,
      );
      void this.redisStateService?.publishEvent(
        'speaker_promoted',
        promotedPayload,
        data.roomId,
        userId,
      );

      return { success: true, speaker: res.speaker };
    } catch (err: any) {
      return {
        success: false,
        error: err.code || 'PROMOTE_FAILED',
        message: err.message,
      };
    }
  }

  @SubscribeMessage('stage:demote')
  @SubscribeMessage('demote_speaker')
  async handleDemoteSpeaker(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: StageDemoteDto,
  ) {
    try {
      const userId = this.resolveUserId(client);
      await this.assertRoomAccess(client, data.roomId);
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

      void this.redisStateService?.publishEvent(
        'stage_updated',
        stagePayload,
        data.roomId,
        userId,
      );
      void this.redisStateService?.publishEvent(
        'speaker_demoted',
        demotedPayload,
        data.roomId,
        userId,
      );

      return { success: true, targetUserId: data.targetUserId };
    } catch (err: any) {
      return {
        success: false,
        error: err.code || 'DEMOTE_FAILED',
        message: err.message,
      };
    }
  }

  @SubscribeMessage('stage:remove')
  @SubscribeMessage('remove_speaker')
  async handleRemoveSpeaker(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: StageRemoveDto,
  ) {
    try {
      const userId = this.resolveUserId(client);
      await this.assertRoomAccess(client, data.roomId);
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

      void this.redisStateService?.publishEvent(
        'stage_updated',
        stagePayload,
        data.roomId,
        userId,
      );
      void this.redisStateService?.publishEvent(
        'speaker_removed',
        removedPayload,
        data.roomId,
        userId,
      );

      return { success: true, targetUserId: data.targetUserId };
    } catch (err: any) {
      return {
        success: false,
        error: err.code || 'REMOVE_FAILED',
        message: err.message,
      };
    }
  }

  @SubscribeMessage('stage:mute')
  @SubscribeMessage('mute_speaker')
  async handleMuteSpeaker(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: StageMuteDto,
  ) {
    try {
      const userId = this.resolveUserId(client);
      await this.assertRoomAccess(client, data.roomId);
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

      void this.redisStateService?.publishEvent(
        'speaker_muted',
        mutedPayload,
        data.roomId,
        userId,
      );
      void this.redisStateService?.publishEvent(
        'stage_updated',
        stagePayload,
        data.roomId,
        userId,
      );

      return { success: true, targetUserId: res.targetUserId, isMuted: true };
    } catch (err: any) {
      return {
        success: false,
        error: err.code || 'MUTE_FAILED',
        message: err.message,
      };
    }
  }

  @SubscribeMessage('stage:unmute')
  @SubscribeMessage('unmute_speaker')
  async handleUnmuteSpeaker(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: StageUnmuteDto,
  ) {
    try {
      const userId = this.resolveUserId(client);
      await this.assertRoomAccess(client, data.roomId);
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

      void this.redisStateService?.publishEvent(
        'speaker_unmuted',
        unmutedPayload,
        data.roomId,
        userId,
      );
      void this.redisStateService?.publishEvent(
        'stage_updated',
        stagePayload,
        data.roomId,
        userId,
      );

      return { success: true, targetUserId: res.targetUserId, isMuted: false };
    } catch (err: any) {
      return {
        success: false,
        error: err.code || 'UNMUTE_FAILED',
        message: err.message,
      };
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
    try {
      const userId = this.resolveUserId(client);
      await this.assertRoomAccess(client, data.roomId);
      const res = await this.roomStateService.updateTopic(
        data.roomId,
        userId,
        data.title,
        data.description,
        data.category,
      );
      this.server.to(data.roomId).emit('room_topic_updated', res);
      void this.redisStateService?.publishEvent(
        'room_topic_updated',
        res,
        data.roomId,
        userId,
      );

      return { success: true, ...res };
    } catch (err: any) {
      return {
        success: false,
        error: err.code || 'UPDATE_TOPIC_FAILED',
        message: err.message,
      };
    }
  }

  // --- Room-level Audience Invitations ---

  @SubscribeMessage('room:invite_participant')
  @SubscribeMessage('invite_participant')
  async handleInviteParticipant(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: RoomAudienceModerationDto,
  ) {
    try {
      const requesterId = this.resolveUserId(client);
      await this.assertRoomAccess(client, data.roomId);
      const result = await this.roomStateService.inviteAudienceParticipant(
        data.roomId,
        requesterId,
        data.targetUserId,
      );
      const payload = {
        roomId: data.roomId,
        targetUserId: result.targetUserId,
        invitedBy: requesterId,
      };
      this.server
        .to(`user:${data.targetUserId}`)
        .emit('room_invitation_received', payload);
      this.server.to(data.roomId).emit('participant_invited', payload);
      void this.redisStateService?.publishEvent(
        'participant_invited',
        payload,
        data.roomId,
        requesterId,
      );
      return { success: true, ...payload };
    } catch (err: any) {
      return {
        success: false,
        error: err.code || 'INVITE_PARTICIPANT_FAILED',
        message: err.message,
      };
    }
  }

  @SubscribeMessage('room:revoke_invitation')
  async handleRevokeParticipantInvitation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: RoomAudienceModerationDto,
  ) {
    try {
      const requesterId = this.resolveUserId(client);
      await this.assertRoomAccess(client, data.roomId);
      const result = await this.roomStateService.revokeAudienceInvitation(
        data.roomId,
        requesterId,
        data.targetUserId,
      );
      const payload = {
        roomId: data.roomId,
        targetUserId: result.targetUserId,
        revokedBy: requesterId,
      };
      this.server
        .to(`user:${data.targetUserId}`)
        .emit('room_invitation_revoked', payload);
      return { success: true, ...payload };
    } catch (err: any) {
      return {
        success: false,
        error: err.code || 'REVOKE_INVITATION_FAILED',
        message: err.message,
      };
    }
  }

  // --- Room-level Audience Moderation ---

  @SubscribeMessage('room:kick_participant')
  @SubscribeMessage('kick_participant')
  async handleKickParticipant(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: RoomAudienceModerationDto,
  ) {
    try {
      const requesterId = this.resolveUserId(client);
      await this.assertRoomAccess(client, data.roomId);
      const result = await this.roomStateService.kickParticipant(
        data.roomId,
        requesterId,
        data.targetUserId,
      );
      const payload = {
        roomId: data.roomId,
        targetUserId: data.targetUserId,
        moderatedBy: requesterId,
        reason: data.reason,
        participantCount: result.participantCount,
      };

      this.server.to(`user:${data.targetUserId}`).emit('room_kicked', payload);
      this.leaveTargetSocketRoom(data.targetUserId, data.roomId);
      this.server.to(data.roomId).emit('participant_kicked', payload);
      void this.redisStateService?.publishEvent(
        'participant_kicked',
        payload,
        data.roomId,
        requesterId,
      );
      return { success: true, ...payload };
    } catch (err: any) {
      return {
        success: false,
        error: err.code || 'KICK_PARTICIPANT_FAILED',
        message: err.message,
      };
    }
  }

  @SubscribeMessage('room:ban_participant')
  @SubscribeMessage('ban_participant')
  async handleBanParticipant(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: RoomAudienceModerationDto,
  ) {
    try {
      const requesterId = this.resolveUserId(client);
      await this.assertRoomAccess(client, data.roomId);
      const result = await this.roomStateService.banParticipant(
        data.roomId,
        requesterId,
        data.targetUserId,
      );
      const payload = {
        roomId: data.roomId,
        targetUserId: data.targetUserId,
        moderatedBy: requesterId,
        reason: data.reason,
        participantCount: result.participantCount,
      };

      this.server.to(`user:${data.targetUserId}`).emit('room_banned', payload);
      this.leaveTargetSocketRoom(data.targetUserId, data.roomId);
      this.server.to(data.roomId).emit('participant_banned', payload);
      void this.redisStateService?.publishEvent(
        'participant_banned',
        payload,
        data.roomId,
        requesterId,
      );
      return { success: true, ...payload };
    } catch (err: any) {
      return {
        success: false,
        error: err.code || 'BAN_PARTICIPANT_FAILED',
        message: err.message,
      };
    }
  }

  @SubscribeMessage('room:unban_participant')
  @SubscribeMessage('unban_participant')
  async handleUnbanParticipant(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: RoomAudienceModerationDto,
  ) {
    try {
      const requesterId = this.resolveUserId(client);
      await this.assertRoomAccess(client, data.roomId);
      const result = await this.roomStateService.unbanParticipant(
        data.roomId,
        requesterId,
        data.targetUserId,
      );
      const payload = {
        roomId: data.roomId,
        targetUserId: result.targetUserId,
        moderatedBy: requesterId,
      };
      this.server.to(data.roomId).emit('participant_unbanned', payload);
      void this.redisStateService?.publishEvent(
        'participant_unbanned',
        payload,
        data.roomId,
        requesterId,
      );
      return { success: true, ...payload };
    } catch (err: any) {
      return {
        success: false,
        error: err.code || 'UNBAN_PARTICIPANT_FAILED',
        message: err.message,
      };
    }
  }

  private leaveTargetSocketRoom(userId: string, roomId: string): void {
    const scopedServer = this.server as unknown as {
      in?: (room: string) => { socketsLeave?: (targetRoom: string) => void };
    };
    scopedServer.in?.(`user:${userId}`).socketsLeave?.(roomId);
  }
}
