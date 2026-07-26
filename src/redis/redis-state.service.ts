import { Inject, Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';
import { REDIS_KEYS, DEFAULT_TTLS } from './redis-keys.constant';

export interface RedisPresenceInfo {
  userId: string;
  socketId: string;
  roomId?: string;
  username?: string;
  deviceType?: string;
  online: boolean;
  lastSeen: string;
}

export interface RedisQueueUser {
  userId: string;
  username?: string;
  joinedAt: string;
}

export interface RedisStageSpeaker {
  userId: string;
  username?: string;
  isMuted: boolean;
  role: 'host' | 'moderator' | 'speaker';
  joinedStageAt: string;
}

export interface RedisRoomParticipant {
  userId: string;
  username?: string;
  socketId: string;
  joinedAt: string;
  lastSeenAt: string;
}

export interface RedisPendingInvitation {
  targetUserId: string;
  invitedBy: string;
  createdAt: string;
}

export interface RedisRoomMeta {
  roomId: string;
  hostId: string;
  title: string;
  description: string;
  category: string;
  isClosed: boolean;
}

export interface PubSubMessage {
  event: string;
  roomId?: string;
  senderId?: string;
  originNodeId?: string;
  payload: any;
  timestamp: string;
}

@Injectable()
export class RedisStateService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisStateService.name);
  private subClient: Redis | null = null;
  private readonly subscribers = new Set<(event: string, payload: any) => void>();
  public readonly nodeId = `node_${Math.random().toString(36).substring(2, 9)}`;

  constructor(@Inject(REDIS_CLIENT) private readonly redisClient: Redis) {}

  async onModuleInit() {
    try {
      if (typeof this.redisClient.duplicate === 'function') {
        this.subClient = this.redisClient.duplicate();
        await this.subClient.subscribe(REDIS_KEYS.GLOBAL_PUBSUB_CHANNEL);
        this.subClient.on('message', (channel, message) => {
          if (channel === REDIS_KEYS.GLOBAL_PUBSUB_CHANNEL) {
            this.handleIncomingPubSubMessage(message);
          }
        });
        this.logger.log(`Redis Pub/Sub subscribed to channel ${REDIS_KEYS.GLOBAL_PUBSUB_CHANNEL}`);
      }
    } catch (err: any) {
      this.logger.warn(`Redis Pub/Sub initialization warning: ${err.message}`);
    }
  }

  async onModuleDestroy() {
    if (this.subClient) {
      try {
        await this.subClient.unsubscribe(REDIS_KEYS.GLOBAL_PUBSUB_CHANNEL);
        await this.subClient.quit();
      } catch (err) {
        // ignore quit error
      }
    }
  }

  // --- Health Check ---
  async isHealthy(): Promise<boolean> {
    try {
      const pong = await this.redisClient.ping();
      return pong === 'PONG';
    } catch {
      return false;
    }
  }

  // --- Pub / Sub Helpers ---
  async publishEvent(event: string, payload: any, roomId?: string, senderId?: string): Promise<void> {
    try {
      const message: PubSubMessage = {
        event,
        roomId,
        senderId,
        originNodeId: this.nodeId,
        payload,
        timestamp: new Date().toISOString(),
      };
      await this.redisClient.publish(REDIS_KEYS.GLOBAL_PUBSUB_CHANNEL, JSON.stringify(message));
    } catch (err: any) {
      this.logger.warn(`Failed to publish Redis event ${event}: ${err.message}`);
    }
  }

  subscribeToEvents(callback: (event: string, payload: any) => void): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private handleIncomingPubSubMessage(messageStr: string) {
    try {
      const data: PubSubMessage = JSON.parse(messageStr);
      for (const sub of this.subscribers) {
        sub(data.event, data);
      }
    } catch (err: any) {
      this.logger.error(`Error parsing incoming PubSub message: ${err.message}`);
    }
  }

  // --- Distributed Presence ---
  async setUserPresence(
    userId: string,
    socketId: string,
    roomId?: string,
    username?: string,
    deviceType = 'mobile',
  ): Promise<void> {
    try {
      const key = REDIS_KEYS.USER_PRESENCE(userId);
      const socketsKey = REDIS_KEYS.USER_SOCKETS(userId);
      const now = new Date().toISOString();

      await this.redisClient.hset(key, {
        userId,
        socketId,
        roomId: roomId || '',
        username: username || '',
        deviceType,
        online: 'true',
        lastSeen: now,
      });
      await this.redisClient.expire(key, DEFAULT_TTLS.PRESENCE_SECONDS);
      await this.redisClient.sadd(socketsKey, socketId);
      await this.redisClient.expire(socketsKey, DEFAULT_TTLS.PRESENCE_SECONDS);
    } catch (err: any) {
      this.logger.warn(`Redis setUserPresence error: ${err.message}`);
    }
  }

  async updateHeartbeat(userId: string, roomId?: string): Promise<void> {
    try {
      const key = REDIS_KEYS.USER_PRESENCE(userId);
      const exists = await this.redisClient.exists(key);
      if (exists) {
        await this.redisClient.hset(key, 'lastSeen', new Date().toISOString());
        if (roomId) await this.redisClient.hset(key, 'roomId', roomId);
        await this.redisClient.expire(key, DEFAULT_TTLS.PRESENCE_SECONDS);
      }
      const socketsKey = REDIS_KEYS.USER_SOCKETS(userId);
      await this.redisClient.expire(socketsKey, DEFAULT_TTLS.PRESENCE_SECONDS);
    } catch (err: any) {
      this.logger.warn(`Redis updateHeartbeat error: ${err.message}`);
    }
  }

  async getUserPresence(userId: string): Promise<RedisPresenceInfo | null> {
    try {
      const key = REDIS_KEYS.USER_PRESENCE(userId);
      const data = await this.redisClient.hgetall(key);
      if (!data || !data.userId) return null;
      return {
        userId: data.userId,
        socketId: data.socketId,
        roomId: data.roomId || undefined,
        username: data.username || undefined,
        deviceType: data.deviceType || 'mobile',
        online: data.online === 'true',
        lastSeen: data.lastSeen,
      };
    } catch (err: any) {
      this.logger.warn(`Redis getUserPresence error: ${err.message}`);
      return null;
    }
  }

  async removeUserPresence(userId: string, socketId: string, roomId?: string): Promise<void> {
    try {
      const socketsKey = REDIS_KEYS.USER_SOCKETS(userId);
      await this.redisClient.srem(socketsKey, socketId);
      const remainingCount = await this.redisClient.scard(socketsKey);

      if (remainingCount === 0) {
        const key = REDIS_KEYS.USER_PRESENCE(userId);
        await this.redisClient.hset(key, 'online', 'false');
        await this.redisClient.expire(key, 60); // Keep offline status for 60s
      }

      if (roomId) {
        const partKey = REDIS_KEYS.ROOM_PARTICIPANTS(roomId);
        await this.redisClient.hdel(partKey, userId);
      }
    } catch (err: any) {
      this.logger.warn(`Redis removeUserPresence error: ${err.message}`);
    }
  }

  // --- Room State & Meta ---
  async getRoomMeta(roomId: string): Promise<RedisRoomMeta | null> {
    try {
      const key = REDIS_KEYS.ROOM_META(roomId);
      const data = await this.redisClient.hgetall(key);
      if (!data || !data.roomId) return null;
      return {
        roomId: data.roomId,
        hostId: data.hostId,
        title: data.title || '',
        description: data.description || '',
        category: data.category || '',
        isClosed: data.isClosed === 'true',
      };
    } catch (err: any) {
      this.logger.warn(`Redis getRoomMeta error: ${err.message}`);
      return null;
    }
  }

  async setRoomMeta(roomId: string, meta: Partial<RedisRoomMeta>): Promise<void> {
    try {
      const key = REDIS_KEYS.ROOM_META(roomId);
      const existing = (await this.getRoomMeta(roomId)) || {
        roomId,
        hostId: meta.hostId || '11111111-1111-1111-1111-111111111111',
        title: 'Voice Room',
        description: '',
        category: 'General',
        isClosed: false,
      };

      const updated: RedisRoomMeta = {
        ...existing,
        ...meta,
        roomId,
      };

      await this.redisClient.hset(key, {
        roomId: updated.roomId,
        hostId: updated.hostId,
        title: updated.title,
        description: updated.description,
        category: updated.category,
        isClosed: String(updated.isClosed),
      });
      await this.redisClient.expire(key, DEFAULT_TTLS.ROOM_STATE_SECONDS);

      if (updated.hostId) {
        const modKey = REDIS_KEYS.ROOM_MODERATORS(roomId);
        await this.redisClient.sadd(modKey, updated.hostId);
        await this.redisClient.expire(modKey, DEFAULT_TTLS.ROOM_STATE_SECONDS);
      }
    } catch (err: any) {
      this.logger.warn(`Redis setRoomMeta error: ${err.message}`);
    }
  }

  // --- Moderators ---
  async isModerator(roomId: string, userId: string): Promise<boolean> {
    try {
      const meta = await this.getRoomMeta(roomId);
      if (meta && meta.hostId === userId) return true;
      const modKey = REDIS_KEYS.ROOM_MODERATORS(roomId);
      return (await this.redisClient.sismember(modKey, userId)) === 1;
    } catch (err: any) {
      this.logger.warn(`Redis isModerator error: ${err.message}`);
      return false;
    }
  }

  async addModerator(roomId: string, userId: string): Promise<void> {
    try {
      const modKey = REDIS_KEYS.ROOM_MODERATORS(roomId);
      await this.redisClient.sadd(modKey, userId);
    } catch (err: any) {
      this.logger.warn(`Redis addModerator error: ${err.message}`);
    }
  }

  // --- Participants ---
  async addRoomParticipant(roomId: string, participant: RedisRoomParticipant): Promise<number> {
    try {
      const key = REDIS_KEYS.ROOM_PARTICIPANTS(roomId);
      await this.redisClient.hset(key, participant.userId, JSON.stringify(participant));
      await this.redisClient.expire(key, DEFAULT_TTLS.ROOM_STATE_SECONDS);
      return await this.redisClient.hlen(key);
    } catch (err: any) {
      this.logger.warn(`Redis addRoomParticipant error: ${err.message}`);
      return 1;
    }
  }

  async removeRoomParticipant(roomId: string, userId: string): Promise<number> {
    try {
      const key = REDIS_KEYS.ROOM_PARTICIPANTS(roomId);
      await this.redisClient.hdel(key, userId);
      return await this.redisClient.hlen(key);
    } catch (err: any) {
      this.logger.warn(`Redis removeRoomParticipant error: ${err.message}`);
      return 0;
    }
  }

  async getRoomParticipants(roomId: string): Promise<RedisRoomParticipant[]> {
    try {
      const key = REDIS_KEYS.ROOM_PARTICIPANTS(roomId);
      const data = await this.redisClient.hgetall(key);
      if (!data) return [];
      return Object.values(data).map((val) => JSON.parse(val));
    } catch (err: any) {
      this.logger.warn(`Redis getRoomParticipants error: ${err.message}`);
      return [];
    }
  }

  async getParticipantCount(roomId: string): Promise<number> {
    try {
      const key = REDIS_KEYS.ROOM_PARTICIPANTS(roomId);
      return await this.redisClient.hlen(key);
    } catch (err: any) {
      this.logger.warn(`Redis getParticipantCount error: ${err.message}`);
      return 0;
    }
  }

  // --- Speakers ---
  async setSpeaker(roomId: string, speaker: RedisStageSpeaker): Promise<RedisStageSpeaker[]> {
    try {
      const key = REDIS_KEYS.ROOM_SPEAKERS(roomId);
      await this.redisClient.hset(key, speaker.userId, JSON.stringify(speaker));
      await this.redisClient.expire(key, DEFAULT_TTLS.ROOM_STATE_SECONDS);
      return await this.getSpeakers(roomId);
    } catch (err: any) {
      this.logger.warn(`Redis setSpeaker error: ${err.message}`);
      return [speaker];
    }
  }

  async removeSpeaker(roomId: string, userId: string): Promise<RedisStageSpeaker[]> {
    try {
      const key = REDIS_KEYS.ROOM_SPEAKERS(roomId);
      await this.redisClient.hdel(key, userId);
      return await this.getSpeakers(roomId);
    } catch (err: any) {
      this.logger.warn(`Redis removeSpeaker error: ${err.message}`);
      return [];
    }
  }

  async getSpeakers(roomId: string): Promise<RedisStageSpeaker[]> {
    try {
      const key = REDIS_KEYS.ROOM_SPEAKERS(roomId);
      const data = await this.redisClient.hgetall(key);
      if (!data) return [];
      return Object.values(data).map((val) => JSON.parse(val));
    } catch (err: any) {
      this.logger.warn(`Redis getSpeakers error: ${err.message}`);
      return [];
    }
  }

  async isSpeaker(roomId: string, userId: string): Promise<boolean> {
    try {
      const key = REDIS_KEYS.ROOM_SPEAKERS(roomId);
      return (await this.redisClient.hexists(key, userId)) === 1;
    } catch (err: any) {
      this.logger.warn(`Redis isSpeaker error: ${err.message}`);
      return false;
    }
  }

  // --- Speaker Queue Operations (Atomic & Synchronized) ---
  async enqueueUser(
    roomId: string,
    queueUser: RedisQueueUser,
  ): Promise<{ queue: RedisQueueUser[]; position: number }> {
    try {
      const queueKey = REDIS_KEYS.ROOM_QUEUE(roomId);
      const existingQueue = await this.getQueue(roomId);

      if (existingQueue.some((q) => q.userId === queueUser.userId)) {
        throw new Error('ALREADY_IN_QUEUE');
      }

      const jsonStr = JSON.stringify(queueUser);
      await this.redisClient.rpush(queueKey, jsonStr);
      await this.redisClient.expire(queueKey, DEFAULT_TTLS.ROOM_STATE_SECONDS);

      const updatedQueue = await this.getQueue(roomId);
      const position = updatedQueue.findIndex((q) => q.userId === queueUser.userId) + 1;
      return { queue: updatedQueue, position };
    } catch (err: any) {
      if (err.message === 'ALREADY_IN_QUEUE') throw err;
      this.logger.warn(`Redis enqueueUser error: ${err.message}`);
      return { queue: [queueUser], position: 1 };
    }
  }

  async dequeueUser(roomId: string, userId: string): Promise<{ queue: RedisQueueUser[] }> {
    try {
      const queueKey = REDIS_KEYS.ROOM_QUEUE(roomId);
      const rawItems = await this.redisClient.lrange(queueKey, 0, -1);
      let removedCount = 0;

      for (const raw of rawItems) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed.userId === userId) {
            await this.redisClient.lrem(queueKey, 0, raw);
            removedCount++;
          }
        } catch {}
      }

      if (removedCount === 0) {
        throw new Error('NOT_IN_QUEUE');
      }

      const updatedQueue = await this.getQueue(roomId);
      return { queue: updatedQueue };
    } catch (err: any) {
      if (err.message === 'NOT_IN_QUEUE') throw err;
      this.logger.warn(`Redis dequeueUser error: ${err.message}`);
      return { queue: [] };
    }
  }

  async getQueue(roomId: string): Promise<RedisQueueUser[]> {
    try {
      const queueKey = REDIS_KEYS.ROOM_QUEUE(roomId);
      const items = await this.redisClient.lrange(queueKey, 0, -1);
      return items.map((item) => JSON.parse(item));
    } catch (err: any) {
      this.logger.warn(`Redis getQueue error: ${err.message}`);
      return [];
    }
  }

  async reorderQueue(
    roomId: string,
    orderedUserIds: string[],
  ): Promise<{ queue: RedisQueueUser[] }> {
    try {
      const queueKey = REDIS_KEYS.ROOM_QUEUE(roomId);
      const currentQueue = await this.getQueue(roomId);

      const newQueue: RedisQueueUser[] = [];
      for (const uId of orderedUserIds) {
        const found = currentQueue.find((q) => q.userId === uId);
        if (found) newQueue.push(found);
      }
      for (const item of currentQueue) {
        if (!newQueue.some((q) => q.userId === item.userId)) {
          newQueue.push(item);
        }
      }

      await this.redisClient.del(queueKey);
      for (const item of newQueue) {
        await this.redisClient.rpush(queueKey, JSON.stringify(item));
      }
      if (newQueue.length > 0) {
        await this.redisClient.expire(queueKey, DEFAULT_TTLS.ROOM_STATE_SECONDS);
      }

      return { queue: newQueue };
    } catch (err: any) {
      this.logger.warn(`Redis reorderQueue error: ${err.message}`);
      return { queue: [] };
    }
  }

  // --- Invitations ---
  async addInvitation(
    roomId: string,
    invitation: RedisPendingInvitation,
    ttlSeconds = DEFAULT_TTLS.INVITATION_SECONDS,
  ): Promise<void> {
    try {
      const key = REDIS_KEYS.ROOM_INVITATIONS(roomId);
      await this.redisClient.hset(key, invitation.targetUserId, JSON.stringify(invitation));
      await this.redisClient.expire(key, ttlSeconds);
    } catch (err: any) {
      this.logger.warn(`Redis addInvitation error: ${err.message}`);
    }
  }

  async removeInvitation(roomId: string, targetUserId: string): Promise<boolean> {
    try {
      const key = REDIS_KEYS.ROOM_INVITATIONS(roomId);
      const removed = await this.redisClient.hdel(key, targetUserId);
      return removed > 0;
    } catch (err: any) {
      this.logger.warn(`Redis removeInvitation error: ${err.message}`);
      return false;
    }
  }

  async getInvitation(roomId: string, targetUserId: string): Promise<RedisPendingInvitation | null> {
    try {
      const key = REDIS_KEYS.ROOM_INVITATIONS(roomId);
      const raw = await this.redisClient.hget(key, targetUserId);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (err: any) {
      this.logger.warn(`Redis getInvitation error: ${err.message}`);
      return null;
    }
  }

  // --- Typing Indicators ---
  async setTyping(
    roomId: string,
    userId: string,
    isTyping: boolean,
    ttlSeconds = DEFAULT_TTLS.TYPING_SECONDS,
  ): Promise<void> {
    try {
      const key = REDIS_KEYS.ROOM_TYPING(roomId);
      if (isTyping) {
        await this.redisClient.hset(key, userId, String(Date.now()));
        await this.redisClient.expire(key, ttlSeconds);
      } else {
        await this.redisClient.hdel(key, userId);
      }
    } catch (err: any) {
      this.logger.warn(`Redis setTyping error: ${err.message}`);
    }
  }

  // --- Room Cleanup ---
  async cleanupRoomState(roomId: string): Promise<void> {
    try {
      const pipeline = this.redisClient.pipeline();
      pipeline.del(REDIS_KEYS.ROOM_META(roomId));
      pipeline.del(REDIS_KEYS.ROOM_MODERATORS(roomId));
      pipeline.del(REDIS_KEYS.ROOM_SPEAKERS(roomId));
      pipeline.del(REDIS_KEYS.ROOM_PARTICIPANTS(roomId));
      pipeline.del(REDIS_KEYS.ROOM_QUEUE(roomId));
      pipeline.del(REDIS_KEYS.ROOM_INVITATIONS(roomId));
      pipeline.del(REDIS_KEYS.ROOM_TYPING(roomId));
      await pipeline.exec();
    } catch (err: any) {
      this.logger.warn(`Redis cleanupRoomState error: ${err.message}`);
    }
  }
}
