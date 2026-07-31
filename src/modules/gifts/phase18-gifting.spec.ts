import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { MultiGiftingService } from './multi-gifting.service';
import { LuckyBoxService } from './lucky-box.service';
import { RedisService } from '../../redis/redis.service';
import { EventsGateway } from '../../common/events/events.gateway';
import { LuckyBoxTier } from './dto/lucky-box.dto';

describe('Phase18 Gifting Engine', () => {
  let multiGiftingService: MultiGiftingService;
  let luckyBoxService: LuckyBoxService;
  let redisService: any;
  let eventsGateway: any;

  beforeEach(async () => {
    redisService = {
      get: jest.fn(),
      set: jest.fn().mockResolvedValue('OK'),
    };

    eventsGateway = {
      server: {
        to: jest.fn().mockReturnValue({
          emit: jest.fn(),
        }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MultiGiftingService,
        LuckyBoxService,
        { provide: RedisService, useValue: redisService },
        { provide: EventsGateway, useValue: eventsGateway },
      ],
    }).compile();

    multiGiftingService = module.get<MultiGiftingService>(MultiGiftingService);
    luckyBoxService = module.get<LuckyBoxService>(LuckyBoxService);
  });

  describe('MultiGiftingService', () => {
    it('should throw BadRequestException if targetUserIds is empty', async () => {
      await expect(
        multiGiftingService.sendMultiRecipientGift('sender-1', {
          targetUserIds: [],
          roomId: 'room-1',
          giftId: 'gift-1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if sender has insufficient coins', async () => {
      redisService.get.mockResolvedValue('50'); // only 50 coins

      await expect(
        multiGiftingService.sendMultiRecipientGift('sender-1', {
          targetUserIds: ['user-1', 'user-2'],
          roomId: 'room-1',
          giftId: 'gift-rocket',
          quantity: 1,
          pricePerUnit: 100, // 200 total required
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should send multi-gift successfully', async () => {
      redisService.get
        .mockResolvedValueOnce('5000') // sender balance
        .mockResolvedValueOnce('0') // recipient 1 diamonds
        .mockResolvedValueOnce('100') // recipient 2 diamonds
        .mockResolvedValueOnce('0'); // streak

      const result = await multiGiftingService.sendMultiRecipientGift(
        'sender-1',
        {
          targetUserIds: ['user-1', 'user-2'],
          roomId: 'room-1',
          giftId: 'gift-rocket',
          quantity: 1,
          pricePerUnit: 100,
        },
      );

      expect(result.success).toBe(true);
      expect(result.data.totalCoinsDeducted).toBe(200);
      expect(result.data.recipients.length).toBe(2);
      expect(eventsGateway.server.to).toHaveBeenCalledWith('room:room-1');
    });
  });

  describe('LuckyBoxService', () => {
    it('should throw BadRequestException if insufficient coins for lucky box', async () => {
      redisService.get.mockResolvedValue('10'); // 10 coins

      await expect(
        luckyBoxService.openLuckyBox('user-1', {
          tier: LuckyBoxTier.GOLD, // costs 1000
          count: 1,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should open lucky box successfully and return rewards', async () => {
      redisService.get.mockResolvedValue('2000'); // 2000 coins

      const result = await luckyBoxService.openLuckyBox('user-1', {
        tier: LuckyBoxTier.BRONZE, // 50 coins
        count: 2,
      });

      expect(result.success).toBe(true);
      expect(result.data.rewards.length).toBe(2);
      expect(redisService.set).toHaveBeenCalled();
    });
  });
});
