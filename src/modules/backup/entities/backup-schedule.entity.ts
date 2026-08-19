import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { BackupType } from './backup-record.entity';

export enum ScheduleFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  CRON = 'CRON',
}

@Entity('backup_schedules')
export class BackupSchedule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({
    type: 'varchar',
    default: BackupType.FULL,
  })
  type: BackupType;

  @Index()
  @Column({
    type: 'varchar',
    default: ScheduleFrequency.DAILY,
  })
  frequency: ScheduleFrequency;

  @Column({ nullable: true })
  cronExpression?: string; // Standard cron syntax e.g. "0 2 * * *"

  @Column({ default: true })
  isEnabled: boolean;

  @Column({
    type: 'jsonb',
    default: ['database', 'redis', 'storage', 'config', 'ssl'],
  })
  components: string[];

  @Column({ type: 'integer', default: 30 })
  retentionDays: number;

  @Column({ type: 'integer', default: 10 })
  maxBackupCount: number;

  @Column({ default: 'local' })
  targetStorage: string; // 'local', 'usb', 'nas', 's3'

  @Column({ nullable: true })
  lastRunAt?: Date;

  @Column({ nullable: true })
  nextRunAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
