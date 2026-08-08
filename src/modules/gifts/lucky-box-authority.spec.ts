import { BadRequestException } from '@nestjs/common';
import { LuckyBoxService } from './lucky-box.service';
import { LuckyBoxTier } from './dto/lucky-box.dto';
import { LuckyBoxOpening } from './entities/lucky-box-opening.entity';

describe('LuckyBoxService PostgreSQL financial authority', () => {
  it('debits through wallet authority and replays a stored opening exactly once', async () => {
    const openings = new Map<string, any>();
    const repository = {
      findOne: jest
        .fn()
        .mockImplementation(
          async ({ where }) => openings.get(where.operationKey) || null,
        ),
      create: jest
        .fn()
        .mockImplementation((value) => ({ id: 'opening-1', ...value })),
      save: jest.fn().mockImplementation(async (value) => {
        openings.set(value.operationKey, value);
        return value;
      }),
    };
    const manager = {
      query: jest.fn().mockResolvedValue(undefined),
      getRepository: jest.fn().mockImplementation((entity) => {
        if (entity === LuckyBoxOpening) return repository;
        throw new Error('Unexpected repository');
      }),
    };
    const dataSource = {
      transaction: jest
        .fn()
        .mockImplementation((callback) => callback(manager)),
    } as any;
    let balance = 1000;
    const walletMutation = {
      debitInTransaction: jest
        .fn()
        .mockImplementation(async (_manager, input) => {
          if (balance < input.amount)
            throw new BadRequestException('Insufficient coins');
          balance -= input.amount;
          return {
            wallet: { coinBalance: balance },
            transaction: { id: 'debit-1' },
          };
        }),
      creditInTransaction: jest
        .fn()
        .mockImplementation(async (_manager, input) => {
          balance += input.amount;
          return {
            wallet: { coinBalance: balance },
            transaction: { id: 'credit-1' },
          };
        }),
    } as any;
    const eventsGateway = {
      server: { to: jest.fn().mockReturnValue({ emit: jest.fn() }) },
    } as any;
    const service = new LuckyBoxService(
      eventsGateway,
      dataSource,
      walletMutation,
    );
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.5);

    const first = await service.openLuckyBox('user-1', {
      tier: LuckyBoxTier.BRONZE,
      count: 1,
      operationKey: 'lucky-box-op-1',
    });
    const afterFirst = balance;
    const replay = await service.openLuckyBox('user-1', {
      tier: LuckyBoxTier.BRONZE,
      count: 1,
      operationKey: 'lucky-box-op-1',
    });
    randomSpy.mockRestore();

    expect(first.idempotent).toBe(false);
    expect(replay.idempotent).toBe(true);
    expect(replay.data).toEqual(first.data);
    expect(balance).toBe(afterFirst);
    expect(walletMutation.debitInTransaction).toHaveBeenCalledTimes(1);
  });
});
