import { Injectable, BadRequestException } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';
import { RegisterDeviceDto, DeviceBanDto } from './dto/auto-moderation.dto';

@Injectable()
export class DeviceSecurityService {
  constructor(private readonly redisService: RedisService) {}

  async registerDevice(userId: string, dto: RegisterDeviceDto) {
    const { deviceId, platform = 'Unknown', ipAddress = '0.0.0.0' } = dto;

    const isBanned = await this.isDeviceBanned(deviceId);
    if (isBanned) {
      throw new BadRequestException(`Device ${deviceId} is permanently banned from VoiceCloud services.`);
    }

    const deviceRecord = {
      deviceId,
      userId,
      platform,
      ipAddress,
      lastActiveAt: new Date().toISOString(),
    };

    // Store device association in Redis
    await this.redisService.set(`device:${deviceId}`, JSON.stringify(deviceRecord), 86400 * 30);
    await this.redisService.set(`user:${userId}:device_id`, deviceId, 86400 * 30);

    return {
      success: true,
      message: 'Device fingerprint registered successfully',
      data: deviceRecord,
    };
  }

  async banDevice(adminId: string, dto: DeviceBanDto) {
    const { deviceId, reason, userId } = dto;

    const banPayload = {
      deviceId,
      bannedByAdminId: adminId,
      reason,
      associatedUserId: userId || null,
      bannedAt: new Date().toISOString(),
    };

    // Store persistent device ban in Redis
    await this.redisService.set(`banned_device:${deviceId}`, JSON.stringify(banPayload));

    return {
      success: true,
      message: `Device ${deviceId} has been banned successfully.`,
      data: banPayload,
    };
  }

  async isDeviceBanned(deviceId: string): Promise<boolean> {
    const banRecord = await this.redisService.get(`banned_device:${deviceId}`);
    return !!banRecord;
  }
}
