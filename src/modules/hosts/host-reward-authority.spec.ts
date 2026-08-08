import { HostRewardAuthorityService } from './host-reward-authority.service';
import { WalletTransaction } from '../wallet/entities/wallet-transaction.entity';
import { HostReward } from './entities/host-reward.entity';

describe('HostRewardAuthorityService', () => {
  it('claims an available Host reward once using wallet ledger evidence', async () => {
    const reward: any = {
      id: 'reward-1',
      userId: 'user-1',
      hostProfileId: 'host-1',
      rewardName: 'Weekly reward',
      type: 'WEEKLY',
      amount: 50,
      currency: 'COINS',
      status: 'AVAILABLE',
      expiresAt: null,
      claimedAt: null,
      claimOperationKey: null,
      walletTransactionId: null,
    };
    const repository = {
      createQueryBuilder: jest.fn().mockReturnValue({
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockImplementation(async () => reward),
      }),
      save: jest.fn().mockImplementation(async (value) => value),
    };
    const walletLedgerRepository = {
      findOne: jest.fn().mockImplementation(async ({ where }) =>
        reward.walletTransactionId && where.id === reward.walletTransactionId
          ? {
              id: reward.walletTransactionId,
              userId: 'user-1',
              transactionType: 'HOST_REWARD',
              referenceId: reward.id,
              operationGroupId: reward.claimOperationKey,
            }
          : null,
      ),
    };
    const manager = {
      query: jest.fn().mockResolvedValue(undefined),
      getRepository: jest.fn().mockImplementation((entity) => {
        if (entity === HostReward) return repository;
        if (entity === WalletTransaction) return walletLedgerRepository;
        throw new Error('Unexpected repository');
      }),
    };
    const dataSource = {
      transaction: jest
        .fn()
        .mockImplementation((callback) => callback(manager)),
    } as any;
    const walletMutation = {
      creditInTransaction: jest.fn().mockResolvedValue({
        transaction: { id: 'host-reward-ledger-1' },
      }),
    } as any;
    const service = new HostRewardAuthorityService(dataSource, walletMutation);

    const first = await service.claim('user-1', 'reward-1');
    const replay = await service.claim('user-1', 'reward-1');

    expect(first.status).toBe('CLAIMED');
    expect(first.walletTransactionId).toBe('host-reward-ledger-1');
    expect(replay.walletTransactionId).toBe('host-reward-ledger-1');
    expect(walletMutation.creditInTransaction).toHaveBeenCalledTimes(1);
  });
});
