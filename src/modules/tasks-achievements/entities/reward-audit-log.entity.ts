import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum RewardType {
  COINS = 'coins',
  DIAMONDS = 'diamonds',
  XP = 'xp',
  VIP_TRIAL = 'vip_trial',
  PROFILE_FRAME = 'profile_frame',
  CHAT_BUBBLE = 'chat_bubble',
  ENTRANCE_EFFECT = 'entrance_effect',
  EXCLUSIVE_STICKER = 'exclusive_sticker',
  BADGE = 'badge',
}

@Entity('reward_audit_logs')
export class RewardAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  userId: string;

  @Column({
    type: 'enum',
    enum: RewardType,
  })
  rewardType: RewardType;

  @Column({ type: 'int', default: 0 })
  amount: number;

  @Column({ type: 'text', nullable: true })
  metadata: string;

  @Column()
  source: string; // e.g. 'task_claim', 'achievement_unlock', 'level_up', 'daily_checkin', 'streak_milestone', 'seasonal_reward', 'admin_grant'

  @Column({ nullable: true })
  sourceId: string;

  @Index('UQ_reward_audit_logs_operationKey', {
    unique: true,
    where: '"operationKey" IS NOT NULL',
  })
  @Column({ type: 'varchar', nullable: true })
  operationKey: string | null;

  @Column({ type: 'uuid', nullable: true })
  walletTransactionId: string | null;

  @Column({ type: 'timestamp', nullable: true })
  settledAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
