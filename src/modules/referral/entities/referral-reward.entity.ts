import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  RewardType,
  RewardTrigger,
  RewardStatus,
} from '../enums/referral.enums';

@Entity('referral_rewards')
export class ReferralReward {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { nullable: true })
  relationshipId: string | null;

  @Column('uuid')
  referrerId: string;

  @Column('uuid', { nullable: true })
  referredUserId: string | null;

  @Column('uuid', { nullable: true })
  campaignId: string | null;

  @Column({
    type: 'enum',
    enum: RewardType,
  })
  rewardType: RewardType;

  @Column('integer', { default: 0 })
  amount: number;

  @Column('varchar', { nullable: true })
  itemId: string | null;

  @Column({
    type: 'enum',
    enum: RewardTrigger,
  })
  triggerEvent: RewardTrigger;

  @Column({
    type: 'enum',
    enum: RewardStatus,
    default: RewardStatus.UNCLAIMED,
  })
  status: RewardStatus;

  @Column('timestamp', { nullable: true })
  claimedAt: Date | null;

  @Column('jsonb', { nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
