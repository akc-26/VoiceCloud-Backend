import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum TaskPeriod {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

@Entity('task_definitions')
export class TaskDefinition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ default: 'task_icon_default' })
  icon: string;

  @Column({
    type: 'enum',
    enum: TaskPeriod,
    default: TaskPeriod.DAILY,
  })
  resetPeriod: TaskPeriod;

  @Column()
  eventKey: string;

  @Column({ type: 'int', default: 1 })
  targetCount: number;

  @Column({ type: 'int', default: 0 })
  rewardCoins: number;

  @Column({ type: 'int', default: 0 })
  rewardDiamonds: number;

  @Column({ type: 'int', default: 0 })
  rewardXp: number;

  @Column({ type: 'int', default: 0 })
  rewardVipDays: number;

  @Column({ nullable: true })
  rewardProfileFrame: string;

  @Column({ nullable: true })
  rewardChatBubble: string;

  @Column({ nullable: true })
  rewardEntranceEffect: string;

  @Column({ nullable: true })
  rewardSticker: string;

  @Column({ nullable: true })
  rewardBadge: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 0 })
  displayOrder: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
