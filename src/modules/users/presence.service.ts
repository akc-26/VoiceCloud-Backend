import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UserSession } from './entities/user-session.entity';
import { UserDevice } from './entities/user-device.entity';
import { UserConnectionHistory } from './entities/user-connection-history.entity';
import { RedisService } from '../../redis/redis.service';
import { EventsGateway } from '../../common/events/events.gateway';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { CreateSessionDto } from './dto/create-session.dto';
import * as crypto from 'crypto';

@Injectable()
export class PresenceService {
  private readonly logger = new Logger(PresenceService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserSession)
    private readonly sessionRepository: Repository<UserSession>,
    @InjectRepository(UserDevice)
    private readonly deviceRepository: Repository<UserDevice>,
    @InjectRepository(UserConnectionHistory)
    private readonly historyRepository: Repository<UserConnectionHistory>,
    private readonly redisService: RedisService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async trackOnline(
    userId: string,
    sessionId?: string,
    deviceType = 'web',
    ipAddress?: string,
    userAgent?: string,
  ) {
    const now = new Date();

    // 1. Update user database record
    await this.userRepository.update(userId, {
      isOnline: true,
      lastActiveAt: now,
    });

    // 2. Manage or create session
    let session: UserSession | null = null;
    if (sessionId) {
      session = await this.sessionRepository.findOne({
        where: { id: sessionId, userId },
      });
      if (session) {
        session.isOnline = true;
        session.lastActiveAt = now;
        await this.sessionRepository.save(session);
      }
    }

    if (!session) {
      const token = `sess_${crypto.randomBytes(16).toString('hex')}`;
      const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
      session = this.sessionRepository.create({
        userId,
        sessionToken: token,
        deviceType: deviceType || 'web',
        deviceName: `${deviceType.toUpperCase()} Session`,
        ipAddress: ipAddress || undefined,
        userAgent: userAgent || undefined,
        isOnline: true,
        lastActiveAt: now,
        expiresAt,
      });
      await this.sessionRepository.save(session);

      this.eventsGateway.broadcastSessionCreated({
        userId,
        sessionId: session.id,
        deviceType: session.deviceType,
        createdAt: session.createdAt,
      });
    }

    // 3. Record Connection History
    const history = this.historyRepository.create({
      userId,
      sessionId: session.id,
      action: 'connect',
      ipAddress: ipAddress || undefined,
      userAgent: userAgent || undefined,
    });
    await this.historyRepository.save(history);

    // 4. Update Redis Presence Cache
    const redis = this.redisService.getClient();
    if (redis) {
      try {
        await redis.sadd('presence:online_users', userId);
        await redis.set(
          `presence:user:${userId}`,
          JSON.stringify({
            userId,
            isOnline: true,
            lastSeen: now.toISOString(),
            sessionId: session.id,
            deviceType: session.deviceType,
          }),
          'EX',
          86400,
        );
        await redis.set(`presence:last_seen:${userId}`, now.toISOString());
      } catch (e) {
        this.logger.error(`Redis cache error on trackOnline: ${e}`);
      }
    }

    // 5. Broadcast WebSocket Events
    const presencePayload = {
      userId,
      isOnline: true,
      lastActiveAt: now,
      sessionId: session.id,
      deviceType: session.deviceType,
    };

    this.eventsGateway.broadcastUserOnline(presencePayload);
    this.eventsGateway.broadcastUserPresenceUpdated(presencePayload);

    return {
      success: true,
      userId,
      isOnline: true,
      sessionId: session.id,
      lastActiveAt: now,
    };
  }

  async trackOffline(userId: string, sessionId?: string) {
    const now = new Date();

    // 1. Mark session offline
    if (sessionId) {
      const session = await this.sessionRepository.findOne({
        where: { id: sessionId, userId },
      });
      if (session) {
        session.isOnline = false;
        session.lastActiveAt = now;
        await this.sessionRepository.save(session);
      }
    }

    // Check if user has other active online sessions
    const activeOnlineSessionsCount = await this.sessionRepository.count({
      where: { userId, isOnline: true },
    });

    const isStillOnline = activeOnlineSessionsCount > 0;

    // 2. Update User entity
    await this.userRepository.update(userId, {
      isOnline: isStillOnline,
      lastActiveAt: now,
    });

    // 3. Connection History
    const history = this.historyRepository.create({
      userId,
      sessionId: sessionId || undefined,
      action: 'disconnect',
    });
    await this.historyRepository.save(history);

    // 4. Redis Cache Update
    const redis = this.redisService.getClient();
    if (redis) {
      try {
        if (!isStillOnline) {
          await redis.srem('presence:online_users', userId);
        }
        await redis.set(
          `presence:user:${userId}`,
          JSON.stringify({
            userId,
            isOnline: isStillOnline,
            lastSeen: now.toISOString(),
          }),
          'EX',
          86400,
        );
        await redis.set(`presence:last_seen:${userId}`, now.toISOString());
      } catch (e) {
        this.logger.error(`Redis cache error on trackOffline: ${e}`);
      }
    }

    // 5. Broadcast WebSocket Events
    const presencePayload = {
      userId,
      isOnline: isStillOnline,
      lastActiveAt: now,
    };

    if (!isStillOnline) {
      this.eventsGateway.broadcastUserOffline(presencePayload);
    }
    this.eventsGateway.broadcastUserPresenceUpdated(presencePayload);

    return {
      success: true,
      userId,
      isOnline: isStillOnline,
      lastActiveAt: now,
    };
  }

  async createSession(userId: string, dto: CreateSessionDto) {
    return this.trackOnline(
      userId,
      undefined,
      dto.deviceType || 'web',
      dto.ipAddress,
      dto.userAgent,
    );
  }

  async getOnlineUsers() {
    // Attempt Redis cache first
    const redis = this.redisService.getClient();
    if (redis) {
      try {
        const userIds = await redis.smembers('presence:online_users');
        if (userIds && userIds.length > 0) {
          const users = await this.userRepository
            .createQueryBuilder('u')
            .where('u.id IN (:...userIds)', { userIds })
            .select([
              'u.id',
              'u.username',
              'u.displayName',
              'u.avatarUrl',
              'u.isOnline',
              'u.lastActiveAt',
              'u.vipBadge',
              'u.hostBadge',
            ])
            .getMany();
          return {
            data: users,
            count: users.length,
          };
        }
      } catch (e) {
        this.logger.warn(`Redis online users error: ${e}`);
      }
    }

    // Fallback to database
    const users = await this.userRepository.find({
      where: { isOnline: true },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        isOnline: true,
        lastActiveAt: true,
        vipBadge: true,
        hostBadge: true,
      },
      order: { lastActiveAt: 'DESC' },
    });

    return {
      data: users,
      count: users.length,
    };
  }

  async getUserPresence(userId: string): Promise<Record<string, unknown>> {
    // Check Redis
    const redis = this.redisService.getClient();
    if (redis) {
      try {
        const cached = await redis.get(`presence:user:${userId}`);
        if (cached) {
          return JSON.parse(cached) as Record<string, unknown>;
        }
      } catch {
        // continue to DB
      }
    }

    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        displayName: true,
        isOnline: true,
        lastActiveAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const sessions = await this.sessionRepository.find({
      where: { userId, isOnline: true },
      select: {
        id: true,
        deviceType: true,
        deviceName: true,
        lastActiveAt: true,
      },
    });

    return {
      userId: user.id,
      username: user.username,
      displayName: user.displayName,
      isOnline: user.isOnline,
      lastActiveAt: user.lastActiveAt,
      activeSessionsCount: sessions.length,
      activeSessions: sessions,
    };
  }

  async getUserLastSeen(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: { id: true, username: true, isOnline: true, lastActiveAt: true },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    return {
      userId: user.id,
      username: user.username,
      isOnline: user.isOnline,
      lastSeen: user.lastActiveAt,
    };
  }

  async getActiveSessions(userId: string) {
    const sessions = await this.sessionRepository.find({
      where: { userId, isOnline: true },
      order: { lastActiveAt: 'DESC' },
    });

    return {
      userId,
      count: sessions.length,
      data: sessions,
    };
  }

  async getConnectedDevices(userId: string) {
    const devices = await this.deviceRepository.find({
      where: { userId },
      order: { lastUsedAt: 'DESC' },
    });

    return {
      userId,
      count: devices.length,
      data: devices,
    };
  }

  async registerDevice(userId: string, dto: RegisterDeviceDto) {
    let device = await this.deviceRepository.findOne({
      where: { userId, deviceId: dto.deviceId },
    });

    if (device) {
      device.deviceType = dto.deviceType;
      device.deviceName = dto.deviceName;
      device.osVersion = dto.osVersion || device.osVersion;
      device.appVersion = dto.appVersion || device.appVersion;
      device.pushToken = dto.pushToken || device.pushToken;
      device.lastUsedAt = new Date();
    } else {
      device = this.deviceRepository.create({
        userId,
        deviceId: dto.deviceId,
        deviceType: dto.deviceType,
        deviceName: dto.deviceName,
        osVersion: dto.osVersion || undefined,
        appVersion: dto.appVersion || undefined,
        pushToken: dto.pushToken || undefined,
        lastUsedAt: new Date(),
      });
    }

    const saved = await this.deviceRepository.save(device);

    // Cache device in Redis
    const redis = this.redisService.getClient();
    if (redis) {
      try {
        await redis.set(
          `presence:device:${userId}:${dto.deviceId}`,
          JSON.stringify(saved),
          'EX',
          86400 * 7,
        );
      } catch (e) {
        this.logger.error(`Error caching device in Redis: ${e}`);
      }
    }

    return saved;
  }

  async terminateSession(userId: string, sessionId: string) {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    session.isOnline = false;
    await this.sessionRepository.save(session);

    const history = this.historyRepository.create({
      userId,
      sessionId,
      action: 'expire',
    });
    await this.historyRepository.save(history);

    // Check if other sessions remain
    const activeCount = await this.sessionRepository.count({
      where: { userId, isOnline: true },
    });

    if (activeCount === 0) {
      await this.userRepository.update(userId, { isOnline: false });
    }

    this.eventsGateway.broadcastSessionExpired({
      userId,
      sessionId,
      terminatedAt: new Date(),
    });

    return {
      message: 'Session terminated successfully',
      sessionId,
      userId,
    };
  }
}
