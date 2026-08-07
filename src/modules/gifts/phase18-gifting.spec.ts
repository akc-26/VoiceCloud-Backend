import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EventsGateway } from '../../common/events/events.gateway';
import { RedisService } from '../../redis/redis.service';
import { LuckyBoxTier } from './dto/lucky-box.dto';
import { GiftingEngineService } from './gifting-engine.service';
import { LuckyBoxService } from './lucky-box.service';
import { MultiGiftingService } from './multi-gifting.service';

describe('Phase18 Gifting Engine', () => {
  let multiGiftingService: MultiGiftingService;
  let luckyBoxService: LuckyBoxService;
  let redisService: any;
  let eventsGateway: any;
  let roomEmitter: any;
  let giftingEngineService: any;

  beforeEach(async () => {
    redisService = {
      get: jest.fn(),
      set: jest.fn().mockResolvedValue('OK'),
    };

    roomEmitter = {
      emit: jest.fn(),
    };

    eventsGateway = {
      server: {
        to: jest.fn().mockReturnValue(roomEmitter),
      },
    };

    giftingEngineService = {
      sendGift: jest.fn().mockResolvedValue({
        success: true,
        message: 'Gift sent',
        data: {
          operationGroupId: 'gift-operation-1',
          totalCoinsDeducted: 200,
          remainingSenderCoins: 800,
          comboCount: 2,
          idempotent: false,
          transactions: [
            { receiverId: 'user-1', creatorEarnings: 70 },
            { receiverId: 'user-2', creatorEarnings: 70 },
          ],
        },
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MultiGiftingService,
        LuckyBoxService,
        { provide: RedisService, useValue: redisService },
        { provide: EventsGateway, useValue: eventsGateway },
        { provide: GiftingEngineService, useValue: giftingEngineService },
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

    it('delegates multi-gift settlement to the authoritative gifting engine', async () => {
      const result = await multiGiftingService.sendMultiRecipientGift(
        'sender-1',
        {
          targetUserIds: ['user-1', 'user-2'],
          roomId: 'room-1',
          giftId: 'gift-rocket',
          quantity: 1,
          pricePerUnit: 1,
          operationKey: 'multi-gift-1',
        },
      );

      expect(giftingEngineService.sendGift).toHaveBeenCalledWith('sender-1', {
        giftId: 'gift-rocket',
        receiverIds: ['user-1', 'user-2'],
        roomId: 'room-1',
        quantity: 1,
        context: 'room',
        operationKey: 'multi-gift-1',
      });
      expect(result.success).toBe(true);
      expect(result.data.totalCoinsDeducted).toBe(200);
      expect(result.data.recipients).toEqual([
        { userId: 'user-1', diamondsEarned: 70 },
        { userId: 'user-2', diamondsEarned: 70 },
      ]);
      expect(eventsGateway.server.to).toHaveBeenCalledWith('room:room-1');
      expect(roomEmitter.emit).toHaveBeenCalledWith(
        'room_multi_gift_blast',
        expect.objectContaining({
          txId: 'gift-operation-1',
          senderId: 'sender-1',
          giftId: 'gift-rocket',
          recipients: ['user-1', 'user-2'],
          totalCoins: 200,
          comboCount: 2,
        }),
      );
    });

    it('does not rebroadcast the legacy event for an idempotent replay', async () => {
      giftingEngineService.sendGift.mockResolvedValueOnce({
        success: true,
        message: 'Gift already settled',
        data: {
          operationGroupId: 'gift-operation-1',
          totalCoinsDeducted: 200,
          remainingSenderCoins: 800,
          comboCount: 2,
          idempotent: true,
          transactions: [
            { receiverId: 'user-1', creatorEarnings: 70 },
            { receiverId: 'user-2', creatorEarnings: 70 },
          ],
        },
      });

      await multiGiftingService.sendMultiRecipientGift('sender-1', {
        targetUserIds: ['user-1', 'user-2'],
        roomId: 'room-1',
        giftId: 'gift-rocket',
        operationKey: 'multi-gift-1',
      });

      expect(roomEmitter.emit).not.toHaveBeenCalled();
    });

    it('does not use the client supplied pricePerUnit as financial authority', async () => {
      await multiGiftingService.sendMultiRecipientGift('sender-1', {
        targetUserIds: ['user-1'],
        roomId: 'room-1',
        giftId: 'gift-rocket',
        pricePerUnit: 1,
      });

      expect(giftingEngineService.sendGift.mock.calls[0][1]).not.toHaveProperty(
        'pricePerUnit',
      );
      expect(redisService.get).not.toHaveBeenCalledWith(
        expect.stringMatching(/^wallet:/),
      );
    });
  });

  describe('LuckyBoxService', () => {
    it('should throw BadRequestException if insufficient coins for lucky box', async () => {
      redisService.get.mockResolvedValue('10');

      await expect(
        luckyBoxService.openLuckyBox('user-1', {
          tier: LuckyBoxTier.GOLD,
          count: 1,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should open lucky box successfully and return rewards', async () => {
      redisService.get.mockResolvedValue('2000');

      const result = await luckyBoxService.openLuckyBox('user-1', {
        tier: LuckyBoxTier.BRONZE,
        count: 2,
      });

      expect(result.success).toBe(true);
      expect(result.data.rewards.length).toBe(2);
      expect(redisService.set).toHaveBeenCalled();
    });
  });
});
