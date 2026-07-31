import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('referral_campaigns')
export class ReferralCampaign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { length: 150 })
  campaignName: string;

  @Column('text', { nullable: true })
  description: string | null;

  @Column('timestamp')
  startDate: Date;

  @Column('timestamp')
  endDate: Date;

  @Column('boolean', { default: true })
  isActive: boolean;

  @Column('jsonb', { default: [] })
  countryRestrictions: string[];

  @Column('jsonb', { default: [] })
  rewardConfiguration: Record<string, any>[];

  @Column('jsonb', { default: {} })
  qualificationRules: Record<string, any>;

  @Column('integer', { default: 0 })
  referralLimits: number;

  @Column('integer', { default: 0 })
  dailyLimits: number;

  @Column('integer', { default: 0 })
  globalLimits: number;

  @Column('integer', { default: 0 })
  currentTotalReferrals: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
