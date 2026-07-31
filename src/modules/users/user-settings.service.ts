import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserSettings } from './entities/user-settings.entity';
import { User } from './entities/user.entity';
import { UpdateUserSettingsDto } from './dto/update-user-settings.dto';

@Injectable()
export class UserSettingsService {
  private readonly logger = new Logger(UserSettingsService.name);

  constructor(
    @InjectRepository(UserSettings)
    private readonly settingsRepository: Repository<UserSettings>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async getOrCreateUserSettings(userId: string): Promise<UserSettings> {
    let settings = await this.settingsRepository.findOne({ where: { userId } });
    if (!settings) {
      settings = this.settingsRepository.create({
        userId,
        messagingPermission: 'everyone',
        followPermission: 'everyone',
        invitationPermission: 'everyone',
        visitorPermission: 'everyone',
        allowVisitorTracking: true,
        anonymousVisiting: false,
        notificationPreferences: {
          email: true,
          push: true,
          inApp: true,
          sound: true,
        },
        language: 'en',
        theme: 'light',
        timezone: 'UTC',
        audioPreset: '324',
        noiseSuppression: true,
        echoCancellation: true,
        agc: true,
        micQueue: true,
        toxicityFilter: true,
        followersOnlyChat: false,
        emailAlerts: true,
        preferredProtocol: 'rtmp',
        latencyMode: 'ultra_low',
        recordingPreference: true,
        streamingPreferences: {
          defaultBitrate: '324',
          audioQuality: 'high',
          echoCancellation: true,
          noiseSuppression: true,
          agc: true,
          preferredProtocol: 'rtmp',
          latencyMode: 'ultra_low',
          recordingPreference: true,
        },
      });
      await this.settingsRepository.save(settings);
    }
    return settings;
  }

  async updateUserSettings(
    userId: string,
    dto: UpdateUserSettingsDto,
  ): Promise<UserSettings> {
    const settings = await this.getOrCreateUserSettings(userId);

    Object.assign(settings, dto);

    if (dto.notificationPreferences) {
      settings.notificationPreferences = {
        ...settings.notificationPreferences,
        ...dto.notificationPreferences,
      };
    }

    if (dto.streamingPreferences) {
      settings.streamingPreferences = {
        ...settings.streamingPreferences,
        ...dto.streamingPreferences,
      };
    }

    return await this.settingsRepository.save(settings);
  }

  async adminGetUserSettings(userId: string): Promise<UserSettings> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.getOrCreateUserSettings(userId);
  }

  async adminOverrideUserSettings(
    userId: string,
    dto: Partial<UserSettings>,
  ): Promise<UserSettings> {
    const settings = await this.getOrCreateUserSettings(userId);
    Object.assign(settings, dto);
    return await this.settingsRepository.save(settings);
  }
}
