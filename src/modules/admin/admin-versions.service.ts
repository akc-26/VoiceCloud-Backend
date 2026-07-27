import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppVersion, AppPlatform } from './entities/app-version.entity';
import {
  CreateAppVersionDto,
  UpdateAppVersionDto,
} from './dto/app-version.dto';
import { RedisService } from '../../redis/redis.service';
import { AdminAuditLogsService } from './admin-audit-logs.service';

const DEFAULT_VERSIONS = [
  {
    platform: AppPlatform.ANDROID,
    latestVersion: '1.2.0',
    minSupportedVersion: '1.0.0',
    forceUpdate: false,
    releaseNotes: 'Bug fixes and performance enhancements',
    downloadUrl:
      'https://play.google.com/store/apps/details?id=com.voicecloud.app',
  },
  {
    platform: AppPlatform.IOS,
    latestVersion: '1.2.0',
    minSupportedVersion: '1.0.0',
    forceUpdate: false,
    releaseNotes: 'Bug fixes and performance enhancements',
    downloadUrl: 'https://apps.apple.com/app/voicecloud/id123456789',
  },
  {
    platform: AppPlatform.WEB,
    latestVersion: '1.2.0',
    minSupportedVersion: '1.0.0',
    forceUpdate: false,
    releaseNotes: 'Web portal updates',
    downloadUrl: 'https://voicecloud.app',
  },
  {
    platform: AppPlatform.DESKTOP,
    latestVersion: '1.2.0',
    minSupportedVersion: '1.0.0',
    forceUpdate: false,
    releaseNotes: 'Desktop app stability improvements',
    downloadUrl: 'https://voicecloud.app/download/desktop',
  },
];

@Injectable()
export class AdminVersionsService implements OnModuleInit {
  private readonly logger = new Logger(AdminVersionsService.name);

  constructor(
    @InjectRepository(AppVersion)
    private readonly versionRepo: Repository<AppVersion>,
    private readonly redisService: RedisService,
    private readonly auditLogsService: AdminAuditLogsService,
  ) {}

  async onModuleInit() {
    await this.seedDefaultVersions();
  }

  private async seedDefaultVersions() {
    for (const item of DEFAULT_VERSIONS) {
      const existing = await this.versionRepo.findOne({
        where: { platform: item.platform, isDeprecated: false },
        order: { createdAt: 'DESC' },
      });
      if (existing) {
        let updated = false;
        if (
          existing.latestVersion !== item.latestVersion ||
          existing.minSupportedVersion !== item.minSupportedVersion ||
          existing.downloadUrl !== item.downloadUrl
        ) {
          existing.latestVersion = item.latestVersion;
          existing.minSupportedVersion = item.minSupportedVersion;
          existing.downloadUrl = item.downloadUrl;
          updated = true;
        }
        if (updated) {
          await this.versionRepo.save(existing);
        }
      } else {
        const ver = this.versionRepo.create(item);
        await this.versionRepo.save(ver);
        this.logger.log(
          `[Seed] Created App Version record for ${item.platform}`,
        );
      }
    }
  }

  async findLatestByPlatform(
    platform: AppPlatform = AppPlatform.ANDROID,
  ): Promise<AppVersion | null> {
    const cacheKey = `cache:app_version:${platform}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached) as AppVersion;
      } catch {
        // Fallthrough
      }
    }

    const version = await this.versionRepo.findOne({
      where: { platform, isDeprecated: false },
      order: { createdAt: 'DESC' },
    });

    if (version) {
      await this.redisService.set(cacheKey, JSON.stringify(version), 3600);
    }
    return version;
  }

  async findAll(): Promise<AppVersion[]> {
    return this.versionRepo.find({
      order: { platform: 'ASC', createdAt: 'DESC' },
    });
  }

  async create(dto: CreateAppVersionDto, userId?: string): Promise<AppVersion> {
    const version = this.versionRepo.create(dto);
    const saved = await this.versionRepo.save(version);

    await this.redisService.del(`cache:app_version:${saved.platform}`);

    await this.auditLogsService.log({
      userId,
      module: 'app_versions',
      action: 'create',
      newValue: saved,
    });

    return saved;
  }

  async update(
    id: string,
    dto: UpdateAppVersionDto,
    userId?: string,
  ): Promise<AppVersion> {
    const version = await this.versionRepo.findOne({ where: { id } });
    if (!version) {
      throw new Error(`AppVersion record with id '${id}' not found`);
    }

    const previousValue = { ...version };
    Object.assign(version, dto);
    const updated = await this.versionRepo.save(version);

    await this.redisService.del(`cache:app_version:${updated.platform}`);

    await this.auditLogsService.log({
      userId,
      module: 'app_versions',
      action: 'update',
      previousValue: previousValue,
      newValue: updated,
    });

    return updated;
  }
}
