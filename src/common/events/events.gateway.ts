import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/realtime',
})
@Injectable()
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join_room')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    if (data?.roomId) {
      void client.join(data.roomId);
      this.logger.log(`Client ${client.id} joined room ${data.roomId}`);
    }
  }

  @SubscribeMessage('leave_room')
  handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    if (data?.roomId) {
      void client.leave(data.roomId);
      this.logger.log(`Client ${client.id} left room ${data.roomId}`);
    }
  }

  broadcastToRoom(roomId: string, event: string, payload: unknown) {
    this.logger.log(`Broadcasting event '${event}' to room ${roomId}`);
    if (this.server) {
      this.server.to(roomId).emit(event, payload);
      this.server.emit(event, payload);
    }
  }

  broadcastVipEvent(event: string, payload: unknown) {
    this.logger.log(`Broadcasting VIP event: ${event}`);
    this.server?.emit(event, payload);
  }

  broadcastHostEvent(event: string, payload: unknown) {
    this.logger.log(`Broadcasting Host event: ${event}`);
    this.server?.emit(event, payload);
  }

  broadcastAgencyEvent(event: string, payload: unknown) {
    this.logger.log(`Broadcasting Agency event: ${event}`);
    this.server?.emit(event, payload);
  }

  broadcastNotificationEvent(event: string, payload: unknown) {
    this.logger.log(`Broadcasting Notification event: ${event}`);
    this.server?.emit(event, payload);
  }

  broadcastAnnouncementEvent(event: string, payload: unknown) {
    this.logger.log(`Broadcasting Announcement event: ${event}`);
    this.server?.emit(event, payload);
  }

  broadcastModerationEvent(event: string, payload: unknown) {
    this.logger.log(`Broadcasting Moderation event: ${event}`);
    this.server?.emit(event, payload);
  }

  broadcastReportEvent(event: string, payload: unknown) {
    this.logger.log(`Broadcasting Report event: ${event}`);
    this.server?.emit(event, payload);
  }

  broadcastUserBlockEvent(event: string, payload: unknown) {
    this.logger.log(`Broadcasting User Block event: ${event}`);
    this.server?.emit(event, payload);
  }

  broadcastAvatarUpdated(payload: unknown) {
    this.logger.log('Broadcasting Avatar Updated event');
    this.server?.emit('avatar_updated', payload);
  }

  broadcastRoomImageUpdated(payload: unknown) {
    this.logger.log('Broadcasting Room Image Updated event');
    this.server?.emit('room_image_updated', payload);
  }

  broadcastGiftMediaUpdated(payload: unknown) {
    this.logger.log('Broadcasting Gift Media Updated event');
    this.server?.emit('gift_media_updated', payload);
  }

  broadcastAnnouncementUpdated(payload: unknown) {
    this.logger.log('Broadcasting Announcement Updated event');
    this.server?.emit('announcement_updated', payload);
  }

  broadcastRankingEvent(event: string, payload: unknown) {
    this.logger.log(`Broadcasting Ranking event: ${event}`);
    this.server?.emit(event, payload);
  }

  broadcastTrendingEvent(event: string, payload: unknown) {
    this.logger.log(`Broadcasting Trending event: ${event}`);
    this.server?.emit(event, payload);
  }

  broadcastLeaderboardEvent(event: string, payload: unknown) {
    this.logger.log(`Broadcasting Leaderboard event: ${event}`);
    this.server?.emit(event, payload);
  }

  broadcastLiveRoomRankingEvent(payload: unknown) {
    this.logger.log('Broadcasting Live Room Ranking Change event');
    this.server?.emit('live_room_ranking_change', payload);
  }

  // Phase 10 - Presence & Social Events
  broadcastUserOnline(payload: unknown) {
    this.logger.log('Broadcasting User Online event');
    this.server?.emit('user_online', payload);
  }

  broadcastUserOffline(payload: unknown) {
    this.logger.log('Broadcasting User Offline event');
    this.server?.emit('user_offline', payload);
  }

  broadcastUserPresenceUpdated(payload: unknown) {
    this.logger.log('Broadcasting User Presence Updated event');
    this.server?.emit('user_presence_updated', payload);
  }

  broadcastProfileUpdated(payload: unknown) {
    this.logger.log('Broadcasting Profile Updated event');
    this.server?.emit('profile_updated', payload);
  }

  broadcastFollowAdded(payload: unknown) {
    this.logger.log('Broadcasting Follow Added event');
    this.server?.emit('follow_added', payload);
  }

  broadcastFollowRemoved(payload: unknown) {
    this.logger.log('Broadcasting Follow Removed event');
    this.server?.emit('follow_removed', payload);
  }

  broadcastFollowersUpdated(payload: unknown) {
    this.logger.log('Broadcasting Followers Updated event');
    this.server?.emit('followers_updated', payload);
  }

  broadcastFollowingUpdated(payload: unknown) {
    this.logger.log('Broadcasting Following Updated event');
    this.server?.emit('following_updated', payload);
  }

  broadcastSessionCreated(payload: unknown) {
    this.logger.log('Broadcasting Session Created event');
    this.server?.emit('session_created', payload);
  }

  broadcastSessionExpired(payload: unknown) {
    this.logger.log('Broadcasting Session Expired event');
    this.server?.emit('session_expired', payload);
  }

  // Phase 11 - RTC Events
  broadcastRtcEvent(event: string, payload: unknown) {
    this.logger.log(`Broadcasting RTC event: ${event}`);
    this.server?.emit(event, payload);
  }

  // Phase 12 - System Config & Admin Events
  broadcastSystemConfigEvent(event: string, payload: unknown) {
    this.logger.log(`Broadcasting System Config event: ${event}`);
    this.server?.emit(event, payload);
  }

  broadcastFeatureFlagUpdated(payload: unknown) {
    this.logger.log('Broadcasting Feature Flag Updated event');
    this.server?.emit('feature_flag_updated', payload);
  }

  broadcastMaintenanceModeToggled(payload: unknown) {
    this.logger.log('Broadcasting Maintenance Mode Toggled event');
    this.server?.emit('maintenance_mode_toggled', payload);
  }

  broadcastToAdmin(event: string, payload: unknown) {
    this.logger.log(`Broadcasting Admin event: ${event}`);
    this.server?.emit(event, payload);
  }
}
