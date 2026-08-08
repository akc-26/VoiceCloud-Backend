import { RewardEngineService } from './reward-engine.service';
import { RewardAuditLog } from '../entities/reward-audit-log.entity';

function createAuditRepository() {
  const rows = new Map<string, any>();
  return {
    findOne: jest
      .fn()
      .mockImplementation(async ({ where }) =>
        where.operationKey ? rows.get(where.operationKey) || null : null,
      ),
    create: jest.fn().mockImplementation((value) => ({
      id: `audit-${rows.size + 1}`,
      ...value,
    })),
    save: jest.fn().mockImplementation(async (value) => {
      if (value.operationKey) rows.set(value.operationKey, value);
      return value;
    }),
  };
}

describe('RewardEngineService financial authority', () => {
  it('credits currency rewards once and replays the immutable audit result', async () => {
    const repository = createAuditRepository();
    const manager = {
      query: jest.fn().mockResolvedValue(undefined),
      getRepository: jest.fn().mockImplementation((entity) => {
        if (entity === RewardAuditLog) return repository;
        throw new Error('Unexpected repository');
      }),
    };
    const dataSource = {
      transaction: jest
        .fn()
        .mockImplementation((callback) => callback(manager)),
    } as any;
    const walletMutationService = {
      creditInTransaction: jest.fn().mockResolvedValue({
        wallet: { coinBalance: 100 },
        transaction: { id: 'wallet-ledger-1' },
        idempotent: false,
      }),
    } as any;
    const gateway = { server: { emit: jest.fn() } } as any;
    const service = new RewardEngineService(
      repository as any,
      gateway,
      dataSource,
      walletMutationService,
    );

    const first = await service.distributeReward(
      'user-1',
      { coins: 100 },
      'task_claim',
      'progress-1',
      'reward:task_claim:progress-1:user-1',
    );
    const replay = await service.distributeReward(
      'user-1',
      { coins: 100 },
      'task_claim',
      'progress-1',
      'reward:task_claim:progress-1:user-1',
    );

    expect(first).toHaveLength(1);
    expect(first[0].walletTransactionId).toBe('wallet-ledger-1');
    expect(replay[0].id).toBe(first[0].id);
    expect(walletMutationService.creditInTransaction).toHaveBeenCalledTimes(1);
  });
});
