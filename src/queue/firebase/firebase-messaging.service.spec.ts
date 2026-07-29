import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { FirebaseMessagingService } from './firebase-messaging.service';

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
      ],
    }).compile();

    service = module.get<FirebaseMessagingService>(FirebaseMessagingService);
    service.onModuleInit();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should send single push notification in dry-run mode when no live admin SDK', async () => {
    const res = await service.sendSingleNotification('mock-token-123', {
      title: 'Test Title',
      body: 'Test Body',
      deepLink: 'voicecloud://room/101',
      data: { key1: 'val1' },
    });

    expect(res.success).toBe(true);
    expect(res.messageId).toBeDefined();
  });

  it('should send multicast push notification in dry-run mode', async () => {
    const res = await service.sendMultiNotification(['token1', 'token2'], {
      title: 'Multicast Title',
      body: 'Multicast Body',
    });

    expect(res.success).toBe(true);
    expect(res.successCount).toBe(2);
    expect(res.failureCount).toBe(0);
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

    expect(res.success).toBe(true);
    expect(res.successCount).toBe(2);
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
