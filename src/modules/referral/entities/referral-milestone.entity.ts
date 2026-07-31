import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { RewardType } from '../enums/referral.enums';

@Entity('referral_milestones')
export class ReferralMilestone {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { length: 100 })
  title: string;

  @Column('text', { nullable: true })
  description: string | null;

  @Column('integer')
  requiredCount: number;

  @Column({
    type: 'enum',
    enum: RewardType,
  })
  rewardType: RewardType;

  @Column('integer', { default: 0 })
  amount: number;

  @Column('varchar', { nullable: true })
  itemId: string | null;

  @Column('boolean', { default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
