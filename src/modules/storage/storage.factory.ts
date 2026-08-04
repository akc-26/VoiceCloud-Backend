import { Injectable, Logger } from '@nestjs/common';
import { DynamicConfigService } from '../config/dynamic-config.service';
import { ProviderCategory } from '../admin/entities/provider-config.entity';
import { LocalStorageDriver } from './drivers/local-storage.driver';
import { S3StorageDriver } from './drivers/s3-storage.driver';
import { IStorageDriver } from './drivers/storage-driver.interface';

@Injectable()
export class StorageFactory {
  private readonly logger = new Logger(StorageFactory.name);

  constructor(
    private readonly dynamicConfigService: DynamicConfigService,
    private readonly localDriver: LocalStorageDriver,
    private readonly s3Driver: S3StorageDriver,
  ) {}

  async getActiveDriver(): Promise<IStorageDriver> {
    const configuredDriver = process.env.STORAGE_DRIVER?.trim().toLowerCase();

    // An explicit local setting must take precedence over database provider
    // profiles. This keeps local/private storage usable in isolated acceptance
    // environments even when the default MinIO profile is active.
    if (configuredDriver === 'local') {
      return this.localDriver;
    }

    const activeConfig =
      await this.dynamicConfigService.getActiveProviderConfig(
        ProviderCategory.STORAGE,
      );

    if (!activeConfig || activeConfig.providerType === 'local') {
      return this.localDriver;
    }

    // MinIO, S3, R2, DigitalOcean, Backblaze, GCS
    const config = activeConfig.config || {};
    this.s3Driver.configure({
      bucket: config.bucket || 'voicecloud-media',
      region: config.region || 'us-east-1',
      endpoint: config.endpoint,
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      publicUrlPrefix: config.publicUrlPrefix,
    });

    return this.s3Driver;
  }
}
