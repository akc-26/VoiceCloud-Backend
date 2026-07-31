import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('daily_check_ins')
export class DailyCheckIn {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  userId: string;

  @Column({ type: 'int', default: 1 })
  cycleDay: number; // 1 to 7

  @Column({ nullable: true })
  lastCheckInDate: string; // YYYY-MM-DD

  @Column({ type: 'int', default: 0 })
  totalCheckIns: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
