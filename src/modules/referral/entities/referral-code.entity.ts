import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('referral_codes')
export class ReferralCode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid')
  userId: string;

  @Index({ unique: true })
  @Column('varchar', { length: 50 })
  referralCode: string;

  @Column('boolean', { default: false })
  isCustom: boolean;

  @Column('integer', { default: 0 })
  usageCount: number;

  @Column('boolean', { default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
