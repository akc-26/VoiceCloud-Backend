import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum VipStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export enum SubscriptionCycle {
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY',
}

@Entity('vip_memberships')
export class VipMembership {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar' })
  userId: string;

  @Column({ type: 'varchar' })
  tierId: string;

  @Column({ type: 'varchar', nullable: true })
  planId: string; // Alias for backward compatibility

  @Index()
  @Column({ type: 'varchar' })
  tierName: string;

  @Column({ type: 'varchar', nullable: true })
  planName: string; // Alias for backward compatibility

  @Column({ type: 'int', default: 1 })
  level: number; // 1..10

  @Column({ type: 'varchar', nullable: true })
  badgeUrl: string;

  @Column({ type: 'varchar', nullable: true })
  colorTheme: string;

  @Column({ type: 'json', nullable: true })
  benefits: string[];

  @Index()
  @Column({ type: 'varchar', default: VipStatus.ACTIVE })
  status: VipStatus;

  @Column({ type: 'boolean', default: true })
  autoRenew: boolean;

  @Column({ type: 'varchar', default: SubscriptionCycle.MONTHLY })
  subscriptionCycle: SubscriptionCycle;

  @Column({ type: 'timestamp' })
  startDate: Date;

  @Index()
  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  cancelledAt: Date;

  @Column({ type: 'int', default: 0 })
  experience: number; // VIP EXP points

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  lifetimeSpending: number; // Total spending

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

export { VipMembership as UserVip };
