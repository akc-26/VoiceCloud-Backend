import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { AutoModerationService } from './auto-moderation.service';
import { DeviceSecurityService } from './device-security.service';
import { ModerationService } from './moderation.service';
import { RedisService } from '../../redis/redis.service';

describe('Phase18 AutoModeration & Device Security', () => {
  let autoModerationService: AutoModerationService;
  let deviceSecurityService: DeviceSecurityService;
  let redisService: any;
  let moderationService: any;

  beforeEach(async () => {
    redisService = {
      get: jest.fn(),
      set: jest.fn().mockResolvedValue('OK'),
    };

    moderationService = {
      createAction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AutoModerationService,
        DeviceSecurityService,
        { provide: ModerationService, useValue: moderationService },
        { provide: RedisService, useValue: redisService },
      ],
    }).compile();

    autoModerationService = module.get<AutoModerationService>(
      AutoModerationService,
    );
    deviceSecurityService = module.get<DeviceSecurityService>(
      DeviceSecurityService,
    );
  });

  describe('AutoModerationService', () => {
    it('should evaluate clean content as safe', () => {
      const result = autoModerationService.analyzeContent({
        text: 'Hello everyone in the voice room!',
      });
      expect(result.isSafe).toBe(true);
      expect(result.toxicityScore).toBe(0);
      expect(result.recommendedAction).toBe('ALLOW');
    });

    it('should flag spam/phishing text with high toxicity score', () => {
      const result = autoModerationService.analyzeContent({
        text: 'Claim free-coins-click-here now!',
      });
      expect(result.isSafe).toBe(false);
      expect(result.toxicityScore).toBe(90);
      expect(result.recommendedAction).toBe('AUTO_KICK_USER');
    });
  });

  describe('DeviceSecurityService', () => {
    it('should register a new device successfully when not banned', async () => {
      redisService.get.mockResolvedValue(null); // not banned

      const result = await deviceSecurityService.registerDevice('user-1', {
        deviceId: 'fp-12345',
        platform: 'iOS',
      });

      expect(result.success).toBe(true);
      expect(redisService.set).toHaveBeenCalled();
    });

    it('should throw BadRequestException when registering a banned device', async () => {
      redisService.get.mockResolvedValue(JSON.stringify({ banned: true })); // banned

      await expect(
        deviceSecurityService.registerDevice('user-1', {
          deviceId: 'fp-banned',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should ban device successfully', async () => {
      const result = await deviceSecurityService.banDevice('admin-1', {
        deviceId: 'fp-spam',
        reason: 'Repeated spammer',
      });

      expect(result.success).toBe(true);
      expect(redisService.set).toHaveBeenCalledWith(
        'banned_device:fp-spam',
        expect.any(String),
      );
    });
  });
});
