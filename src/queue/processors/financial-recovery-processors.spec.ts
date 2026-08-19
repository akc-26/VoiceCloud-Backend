import { BadRequestException } from '@nestjs/common';
import { GiftProcessor } from './gift.processor';
import { HostEarningsProcessor } from './host-earnings.processor';
import { HostRewardProcessor } from './host-reward.processor';
import { PayoutProcessor } from './payout.processor';
import { TasksProcessor } from './tasks.processor';
import { VipProcessor } from './vip.processor';
import { JOB_TYPES } from '../queue.constants';

describe('Financial recovery queue processors', () => {
  it('delegates queued reward settlement to persistent reward authority', async () => {
    const rewards = { distributeReward: jest.fn().mockResolvedValue([{ id: 'audit-1' }]) };
    const processor = new TasksProcessor(
      { manualReset: jest.fn() } as any,
      { triggerSeasonRollover: jest.fn() } as any,
      rewards as any,
      { recordStreakActivity: jest.fn() } as any,
    );
    const result = await processor.process({
      id: 'job-1',
      data: {
        action: 'reward_distribution',
        userId: 'user-1',
        payload: { coins: 10, source: 'task_claim', sourceId: 'progress-1' },
      },
    } as any);
    expect(result.success).toBe(true);
    expect(rewards.distributeReward).toHaveBeenCalledWith(
      'user-1',
      expect.any(Object),
      'task_claim',
      'progress-1',
      'reward:queue:task_claim:progress-1:user-1',
    );
  });

  it('fails placeholder task work rather than marking it successful', async () => {
    const processor = new TasksProcessor(
      { manualReset: jest.fn() } as any,
      { triggerSeasonRollover: jest.fn() } as any,
      { distributeReward: jest.fn() } as any,
      { recordStreakActivity: jest.fn() } as any,
    );
    await expect(
      processor.process({ id: 'job-2', data: { action: 'xp_calculation' } } as any),
    ).rejects.toThrow(BadRequestException);
  });

  it('verifies committed gift settlement evidence', async () => {
    const settlement = {
      verifyCommittedSettlement: jest.fn().mockResolvedValue({
        operationGroupId: 'gift-op-1',
        transactionCount: 1,
      }),
    };
    const processor = new GiftProcessor(settlement as any);
    const result = await processor.process({
      id: 'gift-job',
      name: JOB_TYPES.GIFT.SETTLEMENT_VERIFY,
      data: { operationGroupId: 'gift-op-1' },
    } as any);
    expect(result.operationGroupId).toBe('gift-op-1');
  });

  it('keeps payout queue verification-only', async () => {
    const lifecycle = {
      verifyReservedPayout: jest.fn().mockResolvedValue({
        payout: { id: 'payout-1', status: 'PENDING' },
        reservationTransaction: { id: 'reserve-1' },
      }),
    };
    const processor = new PayoutProcessor(lifecycle as any, { createNotification: jest.fn() } as any);
    const result = await processor.process({
      id: 'payout-job',
      data: { payoutRequestId: 'payout-1', action: 'verify_reservation' },
    } as any);
    expect(result.reservationTransactionId).toBe('reserve-1');
    expect(lifecycle.verifyReservedPayout).toHaveBeenCalledTimes(1);
  });

  it('delegates Host reward and earnings recovery to authoritative services', async () => {
    const hosts = { claimReward: jest.fn().mockResolvedValue({ id: 'reward-1', status: 'CLAIMED' }) };
    const rewardProcessor = new HostRewardProcessor(hosts as any);
    await rewardProcessor.process({
      id: 'host-reward-job',
      data: { userId: 'user-1', rewardId: 'reward-1' },
    } as any);
    expect(hosts.claimReward).toHaveBeenCalledWith('user-1', 'reward-1');

    const financial = { getEarnings: jest.fn().mockResolvedValue({ totalEarnings: 100 }) };
    const earningsProcessor = new HostEarningsProcessor(financial as any);
    await earningsProcessor.process({
      id: 'host-earnings-job',
      data: { userId: 'user-1' },
    } as any);
    expect(financial.getEarnings).toHaveBeenCalledWith('user-1');
  });

  it('requires a concrete VIP reward identity for queued distribution', async () => {
    const vip = { claimReward: jest.fn().mockResolvedValue({ id: 'claim-1' }) };
    const processor = new VipProcessor(vip as any);
    await processor.process({
      id: 'vip-job',
      data: { action: 'reward_distribution', userId: 'user-1', rewardId: 'reward-1' },
    } as any);
    expect(vip.claimReward).toHaveBeenCalledWith('user-1', 'reward-1');
  });
});
