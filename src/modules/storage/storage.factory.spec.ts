import { ProviderCategory } from '../admin/entities/provider-config.entity';
import { DynamicConfigService } from '../config/dynamic-config.service';
import { LocalStorageDriver } from './drivers/local-storage.driver';
import { S3StorageDriver } from './drivers/s3-storage.driver';
import { StorageFactory } from './storage.factory';

describe('StorageFactory', () => {
  const originalStorageDriver = process.env.STORAGE_DRIVER;

  afterEach(() => {
    if (originalStorageDriver === undefined) {
      delete process.env.STORAGE_DRIVER;
    } else {
      process.env.STORAGE_DRIVER = originalStorageDriver;
    }
    jest.restoreAllMocks();
  });

  it('honors an explicit local driver over an active MinIO profile', async () => {
    process.env.STORAGE_DRIVER = 'local';

    const dynamicConfigService = {
      getActiveProviderConfig: jest.fn(),
    };
    const localDriver = { providerType: 'local' };
    const s3Driver = { providerType: 's3-compatible', configure: jest.fn() };
    const factory = new StorageFactory(
      dynamicConfigService as unknown as DynamicConfigService,
      localDriver as unknown as LocalStorageDriver,
      s3Driver as unknown as S3StorageDriver,
    );

    await expect(factory.getActiveDriver()).resolves.toBe(localDriver);
    expect(dynamicConfigService.getActiveProviderConfig).not.toHaveBeenCalled();
    expect(s3Driver.configure).not.toHaveBeenCalled();
  });

  it('uses the active provider profile when no local override is set', async () => {
    delete process.env.STORAGE_DRIVER;

    const dynamicConfigService = {
      getActiveProviderConfig: jest.fn().mockResolvedValue({
        providerType: 'minio',
        config: {
          endpoint: 'http://localhost:9000',
          bucket: 'voicecloud-local',
        },
      }),
    };
    const localDriver = { providerType: 'local' };
    const s3Driver = { providerType: 's3-compatible', configure: jest.fn() };
    const factory = new StorageFactory(
      dynamicConfigService as unknown as DynamicConfigService,
      localDriver as unknown as LocalStorageDriver,
      s3Driver as unknown as S3StorageDriver,
    );

    await expect(factory.getActiveDriver()).resolves.toBe(s3Driver);
    expect(dynamicConfigService.getActiveProviderConfig).toHaveBeenCalledWith(
      ProviderCategory.STORAGE,
    );
    expect(s3Driver.configure).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: 'http://localhost:9000',
        bucket: 'voicecloud-local',
      }),
    );
  });
});
