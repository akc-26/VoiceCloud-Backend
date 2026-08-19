import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('host_earnings')
export class HostEarnings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  hostProfileId: string;

  @Column({ type: 'varchar' })
  userId: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0.0 })
  dailyEarnings: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0.0 })
  weeklyEarnings: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0.0 })
  monthlyEarnings: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0.0 })
  lifetimeEarnings: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0.0 })
  pendingSettlements: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0.0 })
  completedSettlements: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0.0 })
  giftIncome: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0.0 })
  vipBonusIncome: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0.0 })
  roomBonusIncome: number;

  @Column({ type: 'timestamp', nullable: true })
  authorityInitializedAt: Date | null;

  @Column({ type: 'uuid', nullable: true })
  authorityBaselineTransactionId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
