import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('seasonal_events')
export class SeasonalEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'timestamp' })
  startDate: Date;

  @Column({ type: 'timestamp' })
  endDate: Date;

  @Column({ type: 'float', default: 1.0 })
  xpMultiplier: number;

  @Column({ type: 'float', default: 1.0 })
  coinMultiplier: number;

  @Column({ type: 'text', nullable: true })
  limitedAchievements: string; // JSON array of achievement IDs or configs

  @Column({ type: 'text', nullable: true })
  rewards: string; // JSON payload of seasonal rewards

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
