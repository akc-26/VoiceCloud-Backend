import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('host_rewards')
export class HostReward {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  hostProfileId: string;

  @Column({ type: 'varchar' })
  userId: string;

  @Column({ type: 'varchar' }) // DAILY | WEEKLY | MONTHLY | MILESTONE | PERFORMANCE_BONUS | SEASONAL
  type: string;

  @Column({ type: 'varchar' })
  rewardName: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', default: 'DIAMONDS' }) // DIAMONDS | COINS | USD
  currency: string;

  @Column({ type: 'varchar', default: 'AVAILABLE' }) // AVAILABLE | CLAIMED | EXPIRED
  status: string;

  @Column({ type: 'timestamp', nullable: true })
  claimedAt: Date | null;

  @Column({ type: 'varchar', nullable: true, unique: true })
  claimOperationKey: string | null;

  @Column({ type: 'uuid', nullable: true })
  walletTransactionId: string | null;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
