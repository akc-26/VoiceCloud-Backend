import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('host_rooms')
export class HostRoom {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  hostProfileId: string;

  @Column({ type: 'varchar' })
  userId: string;

  @Column({ type: 'varchar' })
  title: string;

  @Column({ type: 'varchar', default: 'General' })
  category: string;

  @Column({ type: 'varchar', default: 'INSTANT' }) // INSTANT | SCHEDULED
  type: string;

  @Column({ type: 'varchar', default: 'SCHEDULED' }) // SCHEDULED | LIVE | ENDED | CANCELLED
  status: string;

  @Column({ type: 'timestamp', nullable: true })
  scheduledAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  endedAt: Date | null;

  @Column({ type: 'boolean', default: false })
  isRecurring: boolean;

  @Column({ type: 'varchar', nullable: true })
  recurrenceRule: string | null;

  @Column({ type: 'boolean', default: false })
  isFeatured: boolean;

  @Column({ type: 'int', default: 0 })
  peakListeners: number;

  @Column({ type: 'int', default: 0 })
  totalDurationMinutes: number;

  @Column({ type: 'int', default: 0 })
  coinsEarned: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
