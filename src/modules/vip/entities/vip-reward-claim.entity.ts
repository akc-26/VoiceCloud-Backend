import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('vip_reward_claims')
@Index(['userId', 'rewardId', 'periodKey'])
export class VipRewardClaim {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar' })
  userId: string;

  @Index()
  @Column({ type: 'varchar' })
  rewardId: string;

  @Column({ type: 'varchar' })
  rewardType: string; // DAILY | WEEKLY | MONTHLY

  @Column({ type: 'int', default: 0 })
  coinsClaimed: number;

  @Column({ type: 'int', default: 0 })
  expClaimed: number;

  @Index()
  @Column({ type: 'varchar' })
  periodKey: string; // e.g. '2026-07-29', '2026-W30', '2026-07'

  @Index('UQ_vip_reward_claims_operationKey', { unique: true, where: '"operationKey" IS NOT NULL' })
  @Column({ type: 'varchar', nullable: true })
  operationKey: string | null;

  @Column({ type: 'uuid', nullable: true })
  walletTransactionId: string | null;

  @CreateDateColumn()
  claimedAt: Date;
}
