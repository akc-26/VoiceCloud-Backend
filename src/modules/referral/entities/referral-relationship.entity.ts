import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';
import {
  ActivationStatus,
  QualificationStatus,
  RewardStatus,
  FraudStatus,
} from '../enums/referral.enums';

@Entity('referral_relationships')
export class ReferralRelationship {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid')
  referrerId: string;

  @Index()
  @Column('uuid')
  referredUserId: string;

  @Column('varchar', { length: 50 })
  referralCode: string;

  @Column('timestamp', { default: () => 'CURRENT_TIMESTAMP' })
  registrationDate: Date;

  @Column({
    type: 'enum',
    enum: ActivationStatus,
    default: ActivationStatus.INACTIVE,
  })
  activationStatus: ActivationStatus;

  @Column({
    type: 'enum',
    enum: QualificationStatus,
    default: QualificationStatus.PENDING,
  })
  qualificationStatus: QualificationStatus;

  @Column({
    type: 'enum',
    enum: RewardStatus,
    default: RewardStatus.UNCLAIMED,
  })
  rewardStatus: RewardStatus;

  @Column({
    type: 'enum',
    enum: FraudStatus,
    default: FraudStatus.CLEAN,
  })
  fraudStatus: FraudStatus;

  @Column('uuid', { nullable: true })
  campaignId: string | null;

  @Column('varchar', { nullable: true })
  ipAddress: string | null;

  @Column('varchar', { nullable: true })
  deviceId: string | null;

  @Column('varchar', { nullable: true })
  country: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date | null;
}
