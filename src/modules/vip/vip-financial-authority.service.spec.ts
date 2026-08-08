import { PaymentProviderType } from '../../common/enums';
import { VipFinancialAuthorityService } from './vip-financial-authority.service';
import {
  SubscriptionCycle,
  VipMembership,
  VipReward,
  VipRewardClaim,
  VipRewardType,
  VipStatus,
  VipTier,
  VipTransaction,
} from './entities';
import { User } from '../users/entities/user.entity';
import { WalletBalance } from '../wallet/entities/wallet-balance.entity';
import { WalletTransaction } from '../wallet/entities/wallet-transaction.entity';

describe('VipFinancialAuthorityService', () => {
  function setup() {
    const tier: any = {
      id: 'tier-1',
      name: 'VIP 1 Silver',
      level: 1,
      monthlyPrice: 9.99,
      price: 9.99,
      badge: 'Silver',
      badgeUrl: '',
      colorTheme: '#fff',
      benefits: [],
      activationStatus: true,
      isActive: true,
    };
    let membership: any = null;
    const vipTransactions = new Map<string, any>();
    const walletTransactions: any[] = [];
    const claims = new Map<string, any>();
    const reward: any = {
      id: 'vip-reward-1',
      rewardType: VipRewardType.DAILY,
      title: 'Daily VIP reward',
      minVipLevel: 1,
      coins: 50,
      exp: 10,
      isActive: true,
    };
    const wallet: any = { id: 'wallet-1', userId: 'user-1', coinBalance: 0 };

    const membershipRepo: any = {
      findOne: jest.fn().mockImplementation(async () => membership),
      create: jest
        .fn()
        .mockImplementation((value) => ({ id: 'membership-1', ...value })),
      save: jest.fn().mockImplementation(async (value) => {
        membership = value;
        return value;
      }),
      createQueryBuilder: jest.fn().mockReturnValue({
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockImplementation(async () => membership),
      }),
    };
    const tierRepo = { findOne: jest.fn().mockResolvedValue(tier) };
    const vipTxRepo: any = {
      findOne: jest
        .fn()
        .mockImplementation(
          async ({ where }) => vipTransactions.get(where.operationKey) || null,
        ),
      create: jest
        .fn()
        .mockImplementation((value) => ({ id: 'vip-tx-1', ...value })),
      save: jest.fn().mockImplementation(async (value) => {
        vipTransactions.set(value.operationKey, value);
        return value;
      }),
    };
    const walletTxRepo: any = {
      create: jest.fn().mockImplementation((value) => ({
        id: `wallet-tx-${walletTransactions.length + 1}`,
        ...value,
      })),
      save: jest.fn().mockImplementation(async (value) => {
        walletTransactions.push(value);
        return value;
      }),
    };
    const walletRepo: any = {
      createQueryBuilder: jest.fn().mockReturnValue({
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(wallet),
      }),
      create: jest.fn(),
      save: jest.fn(),
    };
    const claimRepo: any = {
      findOne: jest
        .fn()
        .mockImplementation(
          async ({ where }) =>
            claims.get(
              `${where.userId}:${where.rewardId}:${where.periodKey}`,
            ) || null,
        ),
      create: jest
        .fn()
        .mockImplementation((value) => ({ id: 'claim-1', ...value })),
      save: jest.fn().mockImplementation(async (value) => {
        claims.set(
          `${value.userId}:${value.rewardId}:${value.periodKey}`,
          value,
        );
        return value;
      }),
    };
    const rewardRepo = { findOne: jest.fn().mockResolvedValue(reward) };
    const userRepo = { findOne: jest.fn().mockResolvedValue({ id: 'user-1' }) };
    const manager: any = {
      query: jest.fn().mockResolvedValue(undefined),
      getRepository: jest.fn().mockImplementation((entity) => {
        if (entity === VipMembership) return membershipRepo;
        if (entity === VipTransaction) return vipTxRepo;
        if (entity === VipTier) return tierRepo;
        if (entity === WalletTransaction) return walletTxRepo;
        if (entity === WalletBalance) return walletRepo;
        if (entity === VipRewardClaim) return claimRepo;
        if (entity === VipReward) return rewardRepo;
        if (entity === User) return userRepo;
        throw new Error('Unexpected repository');
      }),
    };
    const dataSource: any = {
      getRepository: jest.fn().mockImplementation((entity) => {
        if (entity === VipTier) return tierRepo;
        if (entity === VipMembership) return membershipRepo;
        throw new Error('Unexpected outer repository');
      }),
      transaction: jest
        .fn()
        .mockImplementation((callback) => callback(manager)),
    };
    const provider = {
      validateReceipt: jest.fn().mockResolvedValue({
        isValid: true,
        transactionId: 'provider-tx-1',
        amount: 9.99,
        currency: 'USD',
        coins: 0,
        bonusCoins: 0,
      }),
      verifySignature: jest.fn().mockResolvedValue(true),
    };
    const paymentFactory = {
      getProvider: jest.fn().mockReturnValue(provider),
    } as any;
    const walletMutation = {
      creditInTransaction: jest
        .fn()
        .mockResolvedValue({ transaction: { id: 'vip-reward-wallet-1' } }),
    } as any;
    const redis = { del: jest.fn().mockResolvedValue(undefined) } as any;
    const notifications = {
      createNotification: jest.fn().mockResolvedValue({ id: 'n1' }),
    } as any;
    const events = { broadcastVipEvent: jest.fn() } as any;
    const service = new VipFinancialAuthorityService(
      dataSource,
      paymentFactory,
      walletMutation,
      redis,
      notifications,
      events,
    );
    return {
      service,
      provider,
      walletTransactions,
      vipTransactions,
      walletMutation,
      membershipRepo,
      reward,
    };
  }

  it('requires a verified external payment before activating membership', async () => {
    const { service } = setup();
    await expect(
      service.subscribe('user-1', {
        tierId: 'tier-1',
        cycle: SubscriptionCycle.MONTHLY,
      }),
    ).rejects.toThrow('verified receipt');
  });

  it('records payment evidence once and replays the same receipt safely', async () => {
    const { service, walletTransactions, vipTransactions } = setup();
    const dto = {
      tierId: 'tier-1',
      cycle: SubscriptionCycle.MONTHLY,
      provider: PaymentProviderType.STRIPE,
      receipt: 'receipt-1',
      operationKey: 'vip:subscribe:user-1:receipt-1',
    };
    const first = await service.subscribe('user-1', dto);
    const replay = await service.subscribe('user-1', dto);
    expect(first.status).toBe(VipStatus.ACTIVE);
    expect(replay.id).toBe(first.id);
    expect(walletTransactions).toHaveLength(1);
    expect(vipTransactions.size).toBe(1);
  });

  it('claims each VIP period reward once through wallet authority', async () => {
    const { service, walletMutation } = setup();
    await service.subscribe('user-1', {
      tierId: 'tier-1',
      cycle: SubscriptionCycle.MONTHLY,
      provider: PaymentProviderType.STRIPE,
      receipt: 'receipt-1',
      operationKey: 'vip:subscribe:user-1:receipt-1',
    });
    const first = await service.claimReward('user-1', 'vip-reward-1');
    const replay = await service.claimReward('user-1', 'vip-reward-1');
    expect(replay.id).toBe(first.id);
    expect(walletMutation.creditInTransaction).toHaveBeenCalledTimes(1);
  });
});
