import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { FraudStatus } from '../enums/referral.enums';

@Entity('referral_fraud_logs')
export class ReferralFraudLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { nullable: true })
  relationshipId: string | null;

  @Column('uuid', { nullable: true })
  referrerId: string | null;

  @Column('uuid', { nullable: true })
  referredUserId: string | null;

  @Column('varchar')
  triggerReason: string;

  @Column('integer', { default: 50 })
  riskScore: number;

  @Column({
    type: 'enum',
    enum: FraudStatus,
    default: FraudStatus.SUSPECTED,
  })
  status: FraudStatus;

  @Column('varchar', { nullable: true })
  ipAddress: string | null;

  @Column('varchar', { nullable: true })
  deviceId: string | null;

  @Column('text', { nullable: true })
  decisionNotes: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
