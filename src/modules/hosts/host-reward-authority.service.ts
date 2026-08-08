import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { WalletBalanceType, WalletTransactionType } from '../../common/enums';
import { WalletMutationService } from '../wallet/wallet-mutation.service';
import { WalletTransaction } from '../wallet/entities/wallet-transaction.entity';
import { HostReward } from './entities/host-reward.entity';

@Injectable()
export class HostRewardAuthorityService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly walletMutationService: WalletMutationService,
  ) {}

  async claim(userId: string, rewardId: string): Promise<HostReward> {
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(HostReward);
      const reward = await repository
        .createQueryBuilder('reward')
        .setLock('pessimistic_write')
        .where('reward.id = :rewardId', { rewardId })
        .andWhere('reward.userId = :userId', { userId })
        .getOne();
      if (!reward) throw new NotFoundException('Reward not found');
      if (reward.expiresAt && reward.expiresAt <= new Date()) {
        reward.status = 'EXPIRED';
        await repository.save(reward);
        throw new ConflictException('Reward has expired');
      }
      if (reward.status === 'CLAIMED') {
        if (!reward.walletTransactionId || !reward.claimOperationKey) {
          throw new ConflictException(
            'Claimed Host reward is missing authoritative wallet evidence',
          );
        }
        const ledger = await manager.getRepository(WalletTransaction).findOne({
          where: {
            id: reward.walletTransactionId,
            userId,
            transactionType: WalletTransactionType.HOST_REWARD,
            referenceId: reward.id,
            operationGroupId: reward.claimOperationKey,
          },
        });
        if (!ledger) {
          throw new ConflictException(
            'Claimed Host reward wallet evidence cannot be verified',
          );
        }
        return reward;
      }
      if (reward.status !== 'AVAILABLE') {
        throw new ConflictException(
          `Reward cannot be claimed from ${reward.status}`,
        );
      }

      const currency = String(reward.currency || '').toUpperCase();
      const balanceType =
        currency === 'COINS'
          ? WalletBalanceType.COIN
          : currency === 'DIAMONDS'
            ? WalletBalanceType.DIAMOND
            : null;
      if (!balanceType) {
        throw new BadRequestException(
          `Host reward currency ${reward.currency} is not supported by wallet authority`,
        );
      }
      const amount = Number(reward.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new BadRequestException('Host reward amount must be positive');
      }

      const claimOperationKey =
        reward.claimOperationKey || `host-reward:${reward.id}:claim`;
      await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
        claimOperationKey,
      ]);
      const wallet = await this.walletMutationService.creditInTransaction(
        manager,
        {
          userId,
          transactionType: WalletTransactionType.HOST_REWARD,
          amount,
          balanceType,
          source: 'HOST_REWARD',
          destination: userId,
          referenceType: 'HOST_REWARD',
          referenceId: reward.id,
          description: reward.rewardName,
          operationKey: `${claimOperationKey}:wallet`,
          operationGroupId: claimOperationKey,
          metadata: {
            hostProfileId: reward.hostProfileId,
            rewardType: reward.type,
          },
        },
      );
      reward.status = 'CLAIMED';
      reward.claimedAt = reward.claimedAt || new Date();
      reward.claimOperationKey = claimOperationKey;
      reward.walletTransactionId = wallet.transaction.id;
      return repository.save(reward);
    });
  }
}
