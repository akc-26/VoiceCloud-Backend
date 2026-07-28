import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('vip_purchase_history')
export class VipPurchaseHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  userId: string;

  @Column({ type: 'varchar' })
  planId: string;

  @Column({ type: 'varchar' })
  planName: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'int' })
  durationDays: number;

  @Column({ type: 'varchar' })
  action: string;

  @CreateDateColumn()
  createdAt: Date;
}
