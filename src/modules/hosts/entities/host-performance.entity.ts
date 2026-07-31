import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('host_performance')
export class HostPerformance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  hostProfileId: string;

  @Column({ type: 'varchar' })
  userId: string;

  @Column({ type: 'int', default: 0 })
  totalRoomsHosted: number;

  @Column({ type: 'int', default: 0 })
  totalAudience: number;

  @Column({ type: 'int', default: 0 })
  peakListeners: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, default: 0.0 })
  avgSessionDurationMinutes: number;

  @Column({ type: 'int', default: 0 })
  giftsReceived: number;

  @Column({ type: 'int', default: 0 })
  coinsEarned: number;

  @Column({ type: 'int', default: 0 })
  diamondsEarned: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0.0 })
  engagementScore: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0.0 })
  audienceRetentionRate: number;

  @Column({ type: 'int', default: 0 })
  speakingTimeMinutes: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
