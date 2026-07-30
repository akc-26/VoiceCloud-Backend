import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

export enum AgencyRewardType {
  DAILY_ACTIVITY = 'DAILY_ACTIVITY',
  WEEKLY_GIFTING = 'WEEKLY_GIFTING',
  MONTHLY_REVENUE = 'MONTHLY_REVENUE',
  RECRUITMENT_MILESTONE = 'RECRUITMENT_MILESTONE',
  PERFORMANCE_MILESTONE = 'PERFORMANCE_MILESTONE',
}

@Entity('agency_rewards')
export class AgencyReward {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  agencyId: string;

  @Column({ type: 'varchar', default: AgencyRewardType.DAILY_ACTIVITY })
  rewardType: AgencyRewardType;

  @Column({ type: 'varchar' })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  targetValue: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  currentValue: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  rewardAmount: number;

  @Column({ type: 'boolean', default: false })
  isClaimed: boolean;

  @Column({ type: 'timestamp', nullable: true })
  claimedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
