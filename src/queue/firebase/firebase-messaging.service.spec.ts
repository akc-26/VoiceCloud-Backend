import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { FirebaseMessagingService } from './firebase-messaging.service';
import { DynamicConfigService } from '../../modules/config/dynamic-config.service';

describe('FirebaseMessagingService', () => {
  let service: FirebaseMessagingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FirebaseMessagingService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              if (key === 'FIREBASE_PROJECT_ID') return 'test-project';
              return null;
            }),
          },
        },
        {
          provide: DynamicConfigService,
          useValue: {
            getActiveProviderConfig: jest.fn().mockResolvedValue(null),
          },
        },
      ],
    }).compile();

    service = module.get<FirebaseMessagingService>(FirebaseMessagingService);
    await service.onModuleInit();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should fail closed when Firebase is not configured', async () => {
    const res = await service.sendSingleNotification('mock-token-123', {
      title: 'Test Title',
      body: 'Test Body',
      deepLink: 'voicecloud://room/101',
      data: { key1: 'val1' },
    });

    expect(res.success).toBe(false);
    expect(res.error).toBe('FIREBASE_NOT_CONFIGURED');
  });

  it('should fail multicast when Firebase is not configured', async () => {
    const res = await service.sendMultiNotification(['token1', 'token2'], {
      title: 'Multicast Title',
      body: 'Multicast Body',
    });

    expect(res.success).toBe(false);
    expect(res.error).toBe('FIREBASE_NOT_CONFIGURED');
    expect(res.successCount).toBe(0);
    expect(res.failureCount).toBe(2);
  });

  it('should handle batch push notifications', async () => {
    const res = await service.sendBatchNotification([
      {
        token: 'token1',
        notification: { title: 'Batch 1', body: 'Body 1' },
      },
      {
        token: 'token2',
        notification: { title: 'Batch 2', body: 'Body 2' },
      },
    ]);

    expect(res.success).toBe(false);
    expect(res.successCount).toBe(0);
    expect(res.failureCount).toBe(2);
  });

  it('should return error if no tokens are provided for multicast', async () => {
    const res = await service.sendMultiNotification([], {
      title: 'No Tokens',
      body: 'Body',
    });

    expect(res.success).toBe(false);
    expect(res.error).toBe('NO_TOKENS_PROVIDED');
  });
});
