import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('user_achievements')
@Index(['userId', 'achievementId'], { unique: true })
export class UserAchievement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  userId: string;

  @Column()
  achievementId: string;

  @CreateDateColumn()
  unlockedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  claimedAt: Date;
}
