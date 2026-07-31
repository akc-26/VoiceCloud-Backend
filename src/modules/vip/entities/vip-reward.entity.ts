import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum VipRewardType {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
}

@Entity('vip_rewards')
export class VipReward {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  title: string;

  @Column({ type: 'varchar', nullable: true })
  description: string;

  @Index()
  @Column({ type: 'varchar', default: VipRewardType.DAILY })
  rewardType: VipRewardType;

  @Index()
  @Column({ type: 'int', default: 1 })
  minVipLevel: number; // 1..10

  @Column({ type: 'int', default: 0 })
  coins: number;

  @Column({ type: 'int', default: 0 })
  exp: number;

  @Column({ type: 'varchar', nullable: true })
  itemType: string; // gift, frame, badge, sticker

  @Column({ type: 'varchar', nullable: true })
  itemId: string;

  @Column({ type: 'int', nullable: true })
  itemDurationDays: number;

  @Column({ type: 'varchar', nullable: true })
  iconUrl: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
