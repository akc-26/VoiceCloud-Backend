import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Room } from '../rooms/entities/room.entity';
import { User } from '../users/entities/user.entity';
import { WalletBalance } from '../wallet/entities/wallet-balance.entity';
import { WalletTransaction } from '../wallet/entities/wallet-transaction.entity';
import { WalletMutationService } from '../wallet/wallet-mutation.service';
import { Gift } from './entities/gift.entity';
import { GiftTransaction } from './entities/gift-transaction.entity';
import { GiftSettlementService } from './gift-settlement.service';

function createHarness() {
  const state = {
    users: new Map<string, any>([
      ['sender', { id: 'sender' }],
      ['receiver-1', { id: 'receiver-1' }],
      ['receiver-2', { id: 'receiver-2' }],
      ['host-1', { id: 'host-1' }],
    ]),
    wallets: new Map<string, any>([
      [
        'sender',
        {
          id: 'wallet-sender',
          userId: 'sender',
          coinBalance: 1000,
          diamondBalance: 0,
          bonusBalance: 0,
          promotionalBalance: 0,
          frozenBalance: 0,
          withdrawableBalance: 0,
          totalCoinsPurchased: 0,
          totalCoinsSpent: 0,
          totalDiamondsEarned: 0,
          totalDiamondsWithdrawn: 0,
        },
      ],
      [
        'receiver-1',
        {
          id: 'wallet-receiver-1',
          userId: 'receiver-1',
          coinBalance: 0,
          diamondBalance: 0,
          bonusBalance: 0,
          promotionalBalance: 0,
          frozenBalance: 0,
          withdrawableBalance: 0,
          totalCoinsPurchased: 0,
          totalCoinsSpent: 0,
          totalDiamondsEarned: 0,
          totalDiamondsWithdrawn: 0,
        },
      ],
      [
        'receiver-2',
        {
          id: 'wallet-receiver-2',
          userId: 'receiver-2',
          coinBalance: 0,
          diamondBalance: 10,
          bonusBalance: 0,
          promotionalBalance: 0,
          frozenBalance: 0,
          withdrawableBalance: 0,
          totalCoinsPurchased: 0,
          totalCoinsSpent: 0,
          totalDiamondsEarned: 0,
          totalDiamondsWithdrawn: 0,
        },
      ],
    ]),
    gifts: new Map<string, any>([
      [
        'gift-1',
        {
          id: 'gift-1',
          name: 'Rocket',
          category: 'Popular',
          type: 'static',
          rarity: 'rare',
          coinPrice: 100,
          creatorEarningsPercentage: 70,
          isActive: true,
          isArchived: false,
          isLimitedEdition: true,
          remainingStock: 10,
          animationUrl: null,
          iconUrl: 'rocket.png',
        },
      ],
    ]),
    rooms: new Map<string, any>([
      ['room-1', { id: 'room-1', hostId: 'host-1' }],
    ]),
    giftTransactions: [] as any[],
    walletTransactions: [] as any[],
  };

  const manager = {
    query: jest.fn().mockResolvedValue([]),
    getRepository: jest.fn().mockImplementation((entity) => {
      if (entity === User) {
        return {
          findOne: jest.fn().mockImplementation(async ({ where }: any) => {
            return state.users.get(where.id) || null;
          }),
        };
      }
      if (entity === WalletBalance) {
        return {
          findOne: jest.fn().mockImplementation(async ({ where }: any) => {
            return state.wallets.get(where.userId) || null;
          }),
          create: jest.fn().mockImplementation((value) => ({
            id: `wallet-${value.userId}`,
            ...value,
          })),
          save: jest.fn().mockImplementation(async (value) => {
            const values = Array.isArray(value) ? value : [value];
            for (const wallet of values) {
              state.wallets.set(wallet.userId, wallet);
            }
            return value;
          }),
        };
      }
      if (entity === WalletTransaction) {
        return {
          findOne: jest.fn().mockImplementation(async ({ where }: any) => {
            return (
              state.walletTransactions.find((item) => item.id === where.id) ||
              null
            );
          }),
          create: jest.fn().mockImplementation((value) => ({
            id: `wallet-tx-${state.walletTransactions.length + 1}`,
            createdAt: new Date(),
            ...value,
          })),
          save: jest.fn().mockImplementation(async (value) => {
            state.walletTransactions.push(value);
            return value;
          }),
        };
      }
      if (entity === Gift) {
        return {
          findOne: jest.fn().mockImplementation(async ({ where }: any) => {
            return state.gifts.get(where.id) || null;
          }),
          save: jest.fn().mockImplementation(async (gift) => {
            state.gifts.set(gift.id, gift);
            return gift;
          }),
        };
      }
      if (entity === GiftTransaction) {
        return {
          find: jest.fn().mockImplementation(async ({ where }: any) => {
            return state.giftTransactions.filter(
              (item) => item.operationGroupId === where.operationGroupId,
            );
          }),
          create: jest.fn().mockImplementation((value) => ({
            id: `gift-tx-${state.giftTransactions.length + 1}`,
            createdAt: new Date(),
            ...value,
          })),
          save: jest.fn().mockImplementation(async (value) => {
            state.giftTransactions.push(value);
            return value;
          }),
        };
      }
      if (entity === Room) {
        return {
          findOne: jest.fn().mockImplementation(async ({ where }: any) => {
            return state.rooms.get(where.id) || null;
          }),
        };
      }
      throw new Error(`Unexpected repository ${entity?.name || entity}`);
    }),
  };

  const cloneMap = (source: Map<string, any>) => {
    return new Map<string, any>(
      [...source.entries()].map(([key, value]) => [
        key,
        structuredClone(value),
      ]),
    );
  };

  const snapshot = () => ({
    wallets: cloneMap(state.wallets),
    gifts: cloneMap(state.gifts),
    giftTransactions: structuredClone(state.giftTransactions),
    walletTransactions: structuredClone(state.walletTransactions),
  });

  const restore = (saved: ReturnType<typeof snapshot>) => {
    state.wallets = saved.wallets;
    state.gifts = saved.gifts;
    state.giftTransactions.splice(
      0,
      state.giftTransactions.length,
      ...saved.giftTransactions,
    );
    state.walletTransactions.splice(
      0,
      state.walletTransactions.length,
      ...saved.walletTransactions,
    );
  };

  const dataSource = {
    transaction: jest.fn().mockImplementation(async (callback) => {
      const saved = snapshot();
      try {
        return await callback(manager);
      } catch (error) {
        restore(saved);
        throw error;
      }
    }),
  } as unknown as DataSource;

  const walletMutationService = {
    getDeterministicLockOrder: (userIds: string[]) => {
      return [...new Set(userIds)].sort((left, right) =>
        left.localeCompare(right),
      );
    },
  } as WalletMutationService;

  return {
    state,
    manager,
    service: new GiftSettlementService(dataSource, walletMutationService),
  };
}

const request = {
  senderId: 'sender',
  giftId: 'gift-1',
  receiverIds: ['receiver-1', 'receiver-2'],
  context: 'room',
  roomId: 'room-1',
  quantity: 1,
  comboCount: 2,
  multiplier: 1,
  operationKey: 'gift-request-1',
};

describe('GiftSettlementService financial authority', () => {
  it('atomically debits sender, credits receivers, persists ledgers and decrements stock', async () => {
    const harness = createHarness();
    const result = await harness.service.settle(request);

    expect(result.idempotent).toBe(false);
    expect(result.totalCoinsDeducted).toBe(200);
    expect(result.remainingSenderCoins).toBe(800);
    expect(result.diamondsPerReceiver).toBe(70);
    expect(harness.state.wallets.get('sender').totalCoinsSpent).toBe(200);
    expect(harness.state.wallets.get('receiver-1').diamondBalance).toBe(70);
    expect(harness.state.wallets.get('receiver-2').diamondBalance).toBe(80);
    expect(harness.state.gifts.get('gift-1').remainingStock).toBe(8);
    expect(harness.state.walletTransactions).toHaveLength(3);
    expect(harness.state.giftTransactions).toHaveLength(2);
    expect(
      harness.state.giftTransactions.every(
        (transaction) =>
          transaction.senderWalletTransactionId &&
          transaction.receiverWalletTransactionId &&
          transaction.settledAt,
      ),
    ).toBe(true);
  });

  it('replays the same operation key without charging or consuming stock twice', async () => {
    const harness = createHarness();
    const first = await harness.service.settle(request);
    const second = await harness.service.settle(request);

    expect(first.idempotent).toBe(false);
    expect(second.idempotent).toBe(true);
    expect(harness.state.wallets.get('sender').coinBalance).toBe(800);
    expect(harness.state.gifts.get('gift-1').remainingStock).toBe(8);
    expect(harness.state.walletTransactions).toHaveLength(3);
    expect(harness.state.giftTransactions).toHaveLength(2);
    expect(harness.manager.query).toHaveBeenCalledWith(
      'SELECT pg_advisory_xact_lock(hashtext($1))',
      ['gift-request-1'],
    );
  });

  it('rejects reuse of an operation key for a different receiver set', async () => {
    const harness = createHarness();
    await harness.service.settle(request);

    await expect(
      harness.service.settle({
        ...request,
        receiverIds: ['receiver-1'],
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('rolls back stock and ledger state when sender balance is insufficient', async () => {
    const harness = createHarness();
    harness.state.wallets.get('sender').coinBalance = 50;

    await expect(harness.service.settle(request)).rejects.toThrow(
      BadRequestException,
    );
    expect(harness.state.wallets.get('sender').coinBalance).toBe(50);
    expect(harness.state.gifts.get('gift-1').remainingStock).toBe(10);
    expect(harness.state.walletTransactions).toHaveLength(0);
    expect(harness.state.giftTransactions).toHaveLength(0);
  });

  it('rolls back the whole settlement when a receiver identity is missing', async () => {
    const harness = createHarness();

    await expect(
      harness.service.settle({
        ...request,
        receiverIds: ['missing-user'],
      }),
    ).rejects.toThrow(NotFoundException);
    expect(harness.state.wallets.get('sender').coinBalance).toBe(1000);
    expect(harness.state.gifts.get('gift-1').remainingStock).toBe(10);
    expect(harness.state.walletTransactions).toHaveLength(0);
  });

  it('uses the persisted room Host when a receiver is omitted', async () => {
    const harness = createHarness();
    const result = await harness.service.settle({
      ...request,
      receiverIds: [],
      operationKey: 'gift-request-host',
    });

    expect(result.receiverIds).toEqual(['host-1']);
    expect(harness.state.wallets.get('host-1').diamondBalance).toBe(70);
  });

  it('rejects self-gifting before any wallet mutation', async () => {
    const harness = createHarness();

    await expect(
      harness.service.settle({
        ...request,
        receiverIds: ['sender'],
      }),
    ).rejects.toThrow(BadRequestException);
    expect(harness.state.wallets.get('sender').coinBalance).toBe(1000);
  });

  it('rejects limited-edition oversell without changing financial state', async () => {
    const harness = createHarness();
    harness.state.gifts.get('gift-1').remainingStock = 1;

    await expect(harness.service.settle(request)).rejects.toThrow(
      BadRequestException,
    );
    expect(harness.state.wallets.get('sender').coinBalance).toBe(1000);
    expect(harness.state.gifts.get('gift-1').remainingStock).toBe(1);
  });
});
