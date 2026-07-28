import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum VipStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

@Entity('user_vips')
export class UserVip {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  userId: string;

  @Column({ type: 'varchar' })
  planId: string;

  @Column({ type: 'varchar' })
  planName: string;

  @Column({ type: 'int', default: 1 })
  level: number;

  @Column({ type: 'varchar', nullable: true })
  badgeUrl: string;

  @Column('simple-array', { nullable: true })
  benefits: string[];

  @Column({ type: 'varchar', default: VipStatus.ACTIVE })
  status: VipStatus;

  @Column({ type: 'boolean', default: true })
  autoRenew: boolean;

  @Column({ type: 'timestamp' })
  startDate: Date;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
