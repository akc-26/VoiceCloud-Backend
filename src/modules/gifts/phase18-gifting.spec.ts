import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { EventsGateway } from '../../common/events/events.gateway';
import { RedisService } from '../../redis/redis.service';
import { LuckyBoxTier } from './dto/lucky-box.dto';
import { GiftingEngineService } from './gifting-engine.service';
import { LuckyBoxService } from './lucky-box.service';
import { MultiGiftingService } from './multi-gifting.service';
import { WalletMutationService } from '../wallet/wallet-mutation.service';
import { LuckyBoxOpening } from './entities/lucky-box-opening.entity';

describe('Phase18 Gifting Engine', () => {
  let multiGiftingService: MultiGiftingService;
  let luckyBoxService: LuckyBoxService;
  let redisService: any;
  let eventsGateway: any;
  let roomEmitter: any;
  let giftingEngineService: any;
  let coinBalance: number;
  let luckyBoxOpenings: Map<string, any>;

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

    coinBalance = 2000;
    luckyBoxOpenings = new Map();
    const luckyBoxRepository = {
      findOne: jest
        .fn()
        .mockImplementation(({ where }) =>
          Promise.resolve(luckyBoxOpenings.get(where.operationKey) || null),
        ),
      create: jest
        .fn()
        .mockImplementation((value) => ({ id: 'opening-1', ...value })),
      save: jest.fn().mockImplementation(async (value) => {
        luckyBoxOpenings.set(value.operationKey, value);
        return value;
      }),
    };
    const dataSource = {
      transaction: jest.fn().mockImplementation(async (callback) =>
        callback({
          query: jest.fn().mockResolvedValue(undefined),
          getRepository: jest.fn().mockImplementation((entity) => {
            if (entity === LuckyBoxOpening) return luckyBoxRepository;
            throw new Error('Unexpected repository in Lucky Box test');
          }),
        }),
      ),
    };
    const walletMutationService = {
      debitInTransaction: jest
        .fn()
        .mockImplementation(async (_manager, input) => {
          if (coinBalance < input.amount)
            throw new BadRequestException('Insufficient coin balance');
          coinBalance -= input.amount;
          return {
            wallet: { coinBalance },
            transaction: { id: 'debit-1' },
            idempotent: false,
          };
        }),
      creditInTransaction: jest
        .fn()
        .mockImplementation(async (_manager, input) => {
          coinBalance += input.amount;
          return {
            wallet: { coinBalance },
            transaction: { id: 'credit-1' },
            idempotent: false,
          };
        }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MultiGiftingService,
        LuckyBoxService,
        { provide: RedisService, useValue: redisService },
        { provide: EventsGateway, useValue: eventsGateway },
        { provide: GiftingEngineService, useValue: giftingEngineService },
        { provide: DataSource, useValue: dataSource },
        { provide: WalletMutationService, useValue: walletMutationService },
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
    it('should reject authoritative wallet debit when coins are insufficient', async () => {
      coinBalance = 10;
      await expect(
        luckyBoxService.openLuckyBox('user-1', {
          tier: LuckyBoxTier.GOLD,
          count: 1,
          operationKey: 'lucky-insufficient',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should settle and replay the same Lucky Box operation exactly once', async () => {
      coinBalance = 2000;
      const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.5);
      const first = await luckyBoxService.openLuckyBox('user-1', {
        tier: LuckyBoxTier.BRONZE,
        count: 2,
        operationKey: 'lucky-authority-1',
      });
      const balanceAfterFirst = coinBalance;
      const replay = await luckyBoxService.openLuckyBox('user-1', {
        tier: LuckyBoxTier.BRONZE,
        count: 2,
        operationKey: 'lucky-authority-1',
      });
      randomSpy.mockRestore();

      expect(first.success).toBe(true);
      expect(first.data.rewards).toHaveLength(2);
      expect(replay.idempotent).toBe(true);
      expect(replay.data.rewards).toEqual(first.data.rewards);
      expect(coinBalance).toBe(balanceAfterFirst);
      expect(redisService.set).not.toHaveBeenCalled();
    });
  });
});
