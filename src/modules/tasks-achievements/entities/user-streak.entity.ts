import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum StreakType {
  LOGIN = 'login',
  HOSTING = 'hosting',
  LISTENING = 'listening',
  GIFTING = 'gifting',
  CHAT = 'chat',
}

@Entity('user_streaks')
@Index(['userId', 'streakType'], { unique: true })
export class UserStreak {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  userId: string;

  @Column({
    type: 'enum',
    enum: StreakType,
  })
  streakType: StreakType;

  @Column({ type: 'int', default: 0 })
  currentStreak: number;

  @Column({ type: 'int', default: 0 })
  longestStreak: number;

  @Column({ nullable: true })
  lastActivityDate: string; // YYYY-MM-DD

  @Column({ type: 'int', default: 0 })
  freezeCount: number;

  @Column({ default: false })
  isFrozen: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
