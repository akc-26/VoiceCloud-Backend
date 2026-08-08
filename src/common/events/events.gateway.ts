import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { RealtimeSocketAuthService } from './services/realtime-socket-auth.service';
import { RealtimeRoomStateService } from './services/realtime-room-state.service';

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

  constructor(
    private readonly socketAuthService: RealtimeSocketAuthService,
    private readonly roomStateService: RealtimeRoomStateService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const user = await this.socketAuthService.authenticate(client);
      await client.join(`user:${user.userId}`);
      this.logger.log(
        `Authenticated realtime client connected: ${client.id} (userId=${user.userId})`,
      );
      client.emit('connection_established', {
        status: 'connected',
        socketId: client.id,
        user: {
          userId: user.userId,
          username: user.username,
          role: user.role,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.socketAuthService.logAuthenticationFailure(client, error);
      client.emit('auth_error', {
        message:
          error instanceof Error
            ? error.message
            : 'Invalid or expired access token',
      });
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: Socket) {
    const user = client.data?.user as { userId?: string } | undefined;
    const joinedRoomIds = client.data?.joinedRoomIds as Set<string> | undefined;

    if (user?.userId && joinedRoomIds) {
      await Promise.all(
        Array.from(joinedRoomIds).map((roomId) =>
          this.roomStateService
            .removeParticipant(roomId, user.userId, client.id)
            .catch(() => undefined),
        ),
      );
    }

    this.logger.log(
      `Realtime client disconnected: ${client.id}${
        user?.userId ? ` (userId=${user.userId})` : ''
      }`,
    );
  }

  broadcastToRoom(roomId: string, event: string, payload: unknown) {
    this.logger.log(`Broadcasting event '${event}' to room ${roomId}`);
    if (this.server) {
      this.server.to(roomId).emit(event, payload);
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
    const userId =
      payload && typeof payload === 'object' && 'userId' in payload
        ? (payload as { userId?: unknown }).userId
        : undefined;

    if (typeof userId === 'string' && userId.length > 0) {
      this.logger.log(
        `Broadcasting Notification event: ${event} to user ${userId}`,
      );
      this.server?.to(`user:${userId}`).emit(event, payload);
      return;
    }

    this.logger.warn(
      `Broadcasting Notification event without user scope: ${event}`,
    );
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

  // Phase 22 - Gift System Events
  broadcastGiftSent(payload: unknown, roomId?: string) {
    this.logger.log('Broadcasting gift_sent event');
    if (roomId) this.broadcastToRoom(roomId, 'gift_sent', payload);
    else this.server?.emit('gift_sent', payload);
  }

  broadcastComboStarted(payload: unknown, roomId?: string) {
    this.logger.log('Broadcasting combo_started event');
    if (roomId) this.broadcastToRoom(roomId, 'combo_started', payload);
    else this.server?.emit('combo_started', payload);
  }

  broadcastComboUpdated(payload: unknown, roomId?: string) {
    this.logger.log('Broadcasting combo_updated event');
    if (roomId) this.broadcastToRoom(roomId, 'combo_updated', payload);
    else this.server?.emit('combo_updated', payload);
  }

  broadcastComboFinished(payload: unknown, roomId?: string) {
    this.logger.log('Broadcasting combo_finished event');
    if (roomId) this.broadcastToRoom(roomId, 'combo_finished', payload);
    else this.server?.emit('combo_finished', payload);
  }

  broadcastFullscreenGift(payload: unknown, roomId?: string) {
    this.logger.log('Broadcasting fullscreen_gift event');
    if (roomId) this.broadcastToRoom(roomId, 'fullscreen_gift', payload);
    else this.server?.emit('fullscreen_gift', payload);
  }

  broadcastRoomGiftAnimation(payload: unknown, roomId?: string) {
    this.logger.log('Broadcasting room_gift_animation event');
    if (roomId) this.broadcastToRoom(roomId, 'room_gift_animation', payload);
    else this.server?.emit('room_gift_animation', payload);
  }

  broadcastLeaderboardUpdate(payload: unknown) {
    this.logger.log('Broadcasting leaderboard_update event');
    this.server?.emit('leaderboard_update', payload);
  }

  // Phase 28 - Daily Tasks & Achievements Events
  broadcastTaskCompleted(payload: unknown) {
    this.logger.log('Broadcasting task_completed event');
    this.server?.emit('task_completed', payload);
  }

  broadcastAchievementUnlocked(payload: unknown) {
    this.logger.log('Broadcasting achievement_unlocked event');
    this.server?.emit('achievement_unlocked', payload);
  }

  broadcastLevelUp(payload: unknown) {
    this.logger.log('Broadcasting level_up event');
    this.server?.emit('level_up', payload);
  }

  broadcastRewardClaimed(payload: unknown) {
    this.logger.log('Broadcasting reward_claimed event');
    this.server?.emit('reward_claimed', payload);
  }

  broadcastStreakUpdated(payload: unknown) {
    this.logger.log('Broadcasting streak_updated event');
    this.server?.emit('streak_updated', payload);
  }

  broadcastSeasonStarted(payload: unknown) {
    this.logger.log('Broadcasting season_started event');
    this.server?.emit('season_started', payload);
  }

  broadcastSeasonEnded(payload: unknown) {
    this.logger.log('Broadcasting season_ended event');
    this.server?.emit('season_ended', payload);
  }

  // Phase 29 - Store & Personalization Mall Events
  broadcastStoreItemPurchased(payload: unknown) {
    this.logger.log('Broadcasting store_item_purchased event');
    this.server?.emit('store_item_purchased', payload);
  }

  broadcastStoreItemEquipped(payload: unknown) {
    this.logger.log('Broadcasting store_item_equipped event');
    this.server?.emit('store_item_equipped', payload);
  }

  broadcastStoreItemGifted(payload: unknown) {
    this.logger.log('Broadcasting store_item_gifted event');
    this.server?.emit('store_item_gifted', payload);
  }

  broadcastEntranceEffectTriggered(payload: unknown, roomId?: string) {
    this.logger.log('Broadcasting entrance_effect_triggered event');
    if (roomId)
      this.broadcastToRoom(roomId, 'entrance_effect_triggered', payload);
    else this.server?.emit('entrance_effect_triggered', payload);
  }
}
