import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('user_referral_milestones')
export class UserReferralMilestone {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid')
  userId: string;

  @Column('uuid')
  milestoneId: string;

  @Column('timestamp', { default: () => 'CURRENT_TIMESTAMP' })
  unlockedAt: Date;

  @Column('timestamp', { nullable: true })
  claimedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
