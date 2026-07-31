import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum TaskStatus {
  LOCKED = 'locked',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CLAIMED = 'claimed',
  EXPIRED = 'expired',
}

@Entity('user_task_progress')
@Index(['userId', 'taskId', 'periodIdentifier'], { unique: true })
export class UserTaskProgress {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  userId: string;

  @Column()
  taskId: string;

  @Column({ type: 'int', default: 0 })
  currentCount: number;

  @Column({ type: 'int', default: 1 })
  targetCount: number;

  @Column({
    type: 'enum',
    enum: TaskStatus,
    default: TaskStatus.ACTIVE,
  })
  status: TaskStatus;

  @Column()
  periodIdentifier: string; // e.g. "2026-07-29" or "2026-W30" or "2026-07"

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  claimedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
