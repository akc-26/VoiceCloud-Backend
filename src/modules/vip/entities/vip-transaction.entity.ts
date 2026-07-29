import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('vip_transactions')
export class VipTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar' })
  userId: string;

  @Column({ type: 'varchar' })
  tierId: string;

  @Column({ type: 'varchar', nullable: true })
  planId: string; // Alias for backward compatibility

  @Column({ type: 'varchar' })
  tierName: string;

  @Column({ type: 'varchar', nullable: true })
  planName: string; // Alias for backward compatibility

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'int', default: 30 })
  durationDays: number; // Legacy duration

  @Column({ type: 'varchar', default: 'MONTHLY' })
  cycle: string; // MONTHLY | QUARTERLY | YEARLY

  @Column({ type: 'varchar' })
  action: string; // SUBSCRIBE | RENEW | CANCEL | UPGRADE | DOWNGRADE | PURCHASE

  @Column({ type: 'varchar', default: 'SUCCESS' })
  status: string; // SUCCESS | FAILED

  @CreateDateColumn()
  createdAt: Date;
}

export { VipTransaction as VipPurchaseHistory };
