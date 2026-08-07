import { GiftingEngineService } from './gifting-engine.service';

function createHarness(options?: { idempotent?: boolean }) {
  const gift = {
    id: 'gift-1',
    name: 'Rocket',
    category: 'Popular',
    type: 'static',
    rarity: 'rare',
    coinPrice: 100,
    creatorEarningsPercentage: 70,
    animationUrl: 'rocket.json',
    iconUrl: 'rocket.png',
  };
  const transactions = [
    {
      id: 'gift-tx-1',
      receiverId: 'receiver-1',
      quantity: 1,
      creatorEarnings: 70,
    },
  ];
  const settlement = {
    gift,
    operationGroupId: 'request-1',
    receiverIds: ['receiver-1'],
    transactions,
    totalCoinsDeducted: 100,
    remainingSenderCoins: 900,
    diamondsPerReceiver: 70,
    comboCount: 1,
    multiplier: 1,
    idempotent: options?.idempotent ?? false,
  };

  const giftSettlementService = {
    settle: jest.fn().mockResolvedValue(settlement),
  };
  const redisService = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
  };
  const emitted: string[] = [];
  const eventsGateway = {
    broadcastGiftSent: jest.fn(() => emitted.push('gift_sent')),
    broadcastComboStarted: jest.fn(() => emitted.push('combo_started')),
    broadcastComboUpdated: jest.fn(() => emitted.push('combo_updated')),
    broadcastFullscreenGift: jest.fn(() => emitted.push('fullscreen')),
    broadcastRoomGiftAnimation: jest.fn(() => emitted.push('animation')),
  };
  const queueRepository = {
    create: jest.fn().mockImplementation((value) => ({
      id: 'queue-1',
      ...value,
    })),
    save: jest.fn().mockImplementation(async (value) => value),
    find: jest.fn(),
    findOne: jest.fn(),
  };
  const transactionRepository = {
    find: jest.fn(),
  };

  const service = new GiftingEngineService(
    transactionRepository as any,
    queueRepository as any,
    redisService as any,
    eventsGateway as any,
    giftSettlementService as any,
  );

  return {
    service,
    giftSettlementService,
    redisService,
    eventsGateway,
    queueRepository,
    emitted,
  };
}

describe('GiftingEngineService authoritative settlement integration', () => {
  it('settles money before updating presentation state or broadcasting', async () => {
    const harness = createHarness();
    const order: string[] = [];
    harness.giftSettlementService.settle.mockImplementation(async () => {
      order.push('settled');
      return {
        gift: {
          id: 'gift-1',
          name: 'Rocket',
          category: 'Popular',
          type: 'static',
          rarity: 'rare',
          coinPrice: 100,
          creatorEarningsPercentage: 70,
          animationUrl: 'rocket.json',
          iconUrl: 'rocket.png',
        },
        operationGroupId: 'request-1',
        receiverIds: ['receiver-1'],
        transactions: [
          {
            id: 'gift-tx-1',
            receiverId: 'receiver-1',
            quantity: 1,
            creatorEarnings: 70,
          },
        ],
        totalCoinsDeducted: 100,
        remainingSenderCoins: 900,
        diamondsPerReceiver: 70,
        comboCount: 1,
        multiplier: 1,
        idempotent: false,
      };
    });
    harness.redisService.set.mockImplementation(async () => {
      order.push('combo-cache');
      return 'OK';
    });
    harness.eventsGateway.broadcastGiftSent.mockImplementation(() =>
      order.push('broadcast'),
    );

    await harness.service.sendGift('sender', {
      giftId: 'gift-1',
      receiverId: 'receiver-1',
      roomId: 'room-1',
      operationKey: 'request-1',
    });

    expect(order.indexOf('settled')).toBeLessThan(order.indexOf('combo-cache'));
    expect(order.indexOf('settled')).toBeLessThan(order.indexOf('broadcast'));
  });

  it('never reads or writes Redis wallet balance keys', async () => {
    const harness = createHarness();

    await harness.service.sendGift('sender', {
      giftId: 'gift-1',
      receiverId: 'receiver-1',
      roomId: 'room-1',
    });

    const redisKeys = [
      ...harness.redisService.get.mock.calls,
      ...harness.redisService.set.mock.calls,
    ].map((call) => String(call[0]));
    expect(redisKeys.some((key) => key.startsWith('wallet:'))).toBe(false);
  });

  it('does not rebroadcast or enqueue an idempotent financial replay', async () => {
    const harness = createHarness({ idempotent: true });

    const result = await harness.service.sendGift('sender', {
      giftId: 'gift-1',
      receiverId: 'receiver-1',
      roomId: 'room-1',
      operationKey: 'request-1',
    });

    expect(result.data.idempotent).toBe(true);
    expect(harness.redisService.set).not.toHaveBeenCalled();
    expect(harness.queueRepository.save).not.toHaveBeenCalled();
    expect(harness.eventsGateway.broadcastGiftSent).not.toHaveBeenCalled();
  });

  it('keeps the committed gift successful when animation queue persistence fails', async () => {
    const harness = createHarness();
    harness.queueRepository.save.mockRejectedValue(
      new Error('queue unavailable'),
    );

    await expect(
      harness.service.sendGift('sender', {
        giftId: 'gift-1',
        receiverId: 'receiver-1',
        roomId: 'room-1',
      }),
    ).resolves.toMatchObject({ success: true });
  });

  it('keeps the committed gift successful when realtime presentation fails', async () => {
    const harness = createHarness();
    harness.eventsGateway.broadcastGiftSent.mockImplementation(() => {
      throw new Error('socket unavailable');
    });

    await expect(
      harness.service.sendGift('sender', {
        giftId: 'gift-1',
        receiverId: 'receiver-1',
        roomId: 'room-1',
      }),
    ).resolves.toMatchObject({ success: true });
  });
});
