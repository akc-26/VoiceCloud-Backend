import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserDevice } from '../users/entities/user-device.entity';
import { UserSession } from '../users/entities/user-session.entity';
import { UserConnectionHistory } from '../users/entities/user-connection-history.entity';
import { AdminSettingsService } from '../admin/admin-settings.service';
import * as crypto from 'crypto';

@Injectable()
export class DeviceSessionService {
  private readonly logger = new Logger(DeviceSessionService.name);

  constructor(
    @InjectRepository(UserDevice)
    private readonly deviceRepo: Repository<UserDevice>,
    @InjectRepository(UserSession)
    private readonly sessionRepo: Repository<UserSession>,
    @InjectRepository(UserConnectionHistory)
    private readonly historyRepo: Repository<UserConnectionHistory>,
    private readonly adminSettingsService: AdminSettingsService,
  ) {}

  private async getMaxDevicesPerUser(): Promise<number> {
    try {
      const setting = await this.adminSettingsService.findByKey('max_devices_per_user');
      if (setting?.value) {
        return parseInt(setting.value, 10);
      }
    } catch {
      // Fallback
    }
    return 5;
  }

  async registerDevice(
    userId: string,
    deviceInfo?: {
      deviceId?: string;
      deviceName?: string;
      deviceType?: string;
      osVersion?: string;
      appVersion?: string;
      manufacturer?: string;
      model?: string;
      pushToken?: string;
      ipAddress?: string;
    },
  ): Promise<UserDevice> {
    const deviceId = deviceInfo?.deviceId || `dev_${crypto.randomUUID()}`;

    let device = await this.deviceRepo.findOne({
      where: { userId, deviceId },
    });

    if (device) {
      device.deviceName = deviceInfo?.deviceName || device.deviceName || 'Mobile Device';
      device.deviceType = deviceInfo?.deviceType || device.deviceType || 'mobile';
      if (deviceInfo?.osVersion) device.osVersion = deviceInfo.osVersion;
      if (deviceInfo?.appVersion) device.appVersion = deviceInfo.appVersion;
      if (deviceInfo?.manufacturer) device.manufacturer = deviceInfo.manufacturer;
      if (deviceInfo?.model) device.model = deviceInfo.model;
      if (deviceInfo?.pushToken) device.pushToken = deviceInfo.pushToken;
      if (deviceInfo?.ipAddress) device.lastIp = deviceInfo.ipAddress;
      device.status = 'ACTIVE';
      device.lastUsedAt = new Date();
      return this.deviceRepo.save(device);
    }

    device = this.deviceRepo.create({
      userId,
      deviceId,
      deviceType: deviceInfo?.deviceType || 'mobile',
      deviceName: deviceInfo?.deviceName || 'Mobile Device',
      osVersion: deviceInfo?.osVersion,
      appVersion: deviceInfo?.appVersion,
      manufacturer: deviceInfo?.manufacturer,
      model: deviceInfo?.model,
      pushToken: deviceInfo?.pushToken,
      lastIp: deviceInfo?.ipAddress,
      status: 'ACTIVE',
      lastUsedAt: new Date(),
    });

    return this.deviceRepo.save(device);
  }

  async createSession(
    userId: string,
    deviceId: string,
    refreshTokenHash: string,
    sessionDetails?: {
      deviceType?: string;
      deviceName?: string;
      ipAddress?: string;
      userAgent?: string;
      expiresAt?: Date;
    },
  ): Promise<UserSession> {
    // Enforce max device sessions
    const maxDevices = await this.getMaxDevicesPerUser();
    const activeSessions = await this.sessionRepo.find({
      where: { userId, status: 'ACTIVE' },
      order: { lastActiveAt: 'ASC' },
    });

    if (activeSessions.length >= maxDevices) {
      const overflowCount = activeSessions.length - maxDevices + 1;
      const sessionsToRevoke = activeSessions.slice(0, overflowCount);
      for (const s of sessionsToRevoke) {
        s.status = 'REVOKED';
        s.isOnline = false;
        await this.sessionRepo.save(s);
        this.logger.log(`Auto-revoked oldest session '${s.id}' for user '${userId}' due to max device limit (${maxDevices})`);
      }
    }

    const sessionToken = `sess_${crypto.randomUUID()}`;
    const session = this.sessionRepo.create({
      userId,
      deviceId,
      sessionToken,
      refreshTokenHash,
      deviceType: sessionDetails?.deviceType || 'mobile',
      deviceName: sessionDetails?.deviceName || 'Mobile Device',
      ipAddress: sessionDetails?.ipAddress || '127.0.0.1',
      userAgent: sessionDetails?.userAgent || 'VoiceCloud App',
      isOnline: true,
      status: 'ACTIVE',
      lastActiveAt: new Date(),
      expiresAt: sessionDetails?.expiresAt || new Date(Date.now() + 7 * 86400 * 1000),
    });

    return this.sessionRepo.save(session);
  }

  async logConnectionHistory(details: {
    userId: string;
    sessionId?: string;
    deviceId?: string;
    action: string;
    loginMethod?: string;
    ipAddress?: string;
    userAgent?: string;
    country?: string;
    platform?: string;
  }): Promise<UserConnectionHistory> {
    const history = this.historyRepo.create({
      userId: details.userId,
      sessionId: details.sessionId,
      deviceId: details.deviceId,
      action: details.action,
      loginMethod: details.loginMethod,
      ipAddress: details.ipAddress,
      userAgent: details.userAgent,
      country: details.country || 'Global',
      platform: details.platform || 'Android',
    });

    return this.historyRepo.save(history);
  }

  async getUserSessions(userId: string): Promise<UserSession[]> {
    return this.sessionRepo.find({
      where: { userId },
      order: { lastActiveAt: 'DESC' },
    });
  }

  async getUserDevices(userId: string): Promise<UserDevice[]> {
    return this.deviceRepo.find({
      where: { userId },
      order: { lastUsedAt: 'DESC' },
    });
  }

  async revokeSession(sessionId: string, userId?: string): Promise<boolean> {
    const where: { id: string; userId?: string } = { id: sessionId };
    if (userId) where.userId = userId;

    const session = await this.sessionRepo.findOne({ where });
    if (!session) return false;

    session.status = 'REVOKED';
    session.isOnline = false;
    await this.sessionRepo.save(session);

    return true;
  }

  async revokeAllSessions(userId: string, exceptSessionId?: string): Promise<number> {
    const activeSessions = await this.sessionRepo.find({
      where: { userId, status: 'ACTIVE' },
    });

    let revokedCount = 0;
    for (const session of activeSessions) {
      if (exceptSessionId && session.id === exceptSessionId) {
        continue;
      }
      session.status = 'REVOKED';
      session.isOnline = false;
      await this.sessionRepo.save(session);
      revokedCount += 1;
    }

    return revokedCount;
  }

  async revokeDevice(deviceId: string, userId: string): Promise<boolean> {
    const device = await this.deviceRepo.findOne({
      where: { deviceId, userId },
    });
    if (!device) return false;

    device.status = 'REVOKED';
    await this.deviceRepo.save(device);

    // Revoke corresponding sessions
    const sessions = await this.sessionRepo.find({
      where: { userId, deviceId, status: 'ACTIVE' },
    });
    for (const s of sessions) {
      s.status = 'REVOKED';
      s.isOnline = false;
      await this.sessionRepo.save(s);
    }

    return true;
  }

  async getUserConnectionHistory(userId: string, limit = 50): Promise<UserConnectionHistory[]> {
    return this.historyRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}
