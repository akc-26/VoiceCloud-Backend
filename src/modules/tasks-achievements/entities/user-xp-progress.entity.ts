import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('user_xp_progress')
export class UserXpProgress {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  userId: string;

  @Column({ type: 'int', default: 1 })
  level: number;

  @Column({ type: 'int', default: 0 })
  currentXp: number;

  @Column({ type: 'int', default: 0 })
  totalXp: number;

  @Column({ default: 'Novice Voice' })
  levelTitle: string;

  @UpdateDateColumn()
  updatedAt: Date;
}
