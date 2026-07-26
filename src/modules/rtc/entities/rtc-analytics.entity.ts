import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('rtc_analytics')
export class RtcAnalytics {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar' })
  sessionId: string;

  @Index()
  @Column({ type: 'varchar' })
  roomId: string;

  @Column({ type: 'int', default: 0 })
  peakAudience: number;

  @Column({ type: 'int', default: 0 })
  avgAudience: number;

  @Column({ type: 'int', default: 0 })
  totalUniqueListeners: number;

  @Column({ type: 'int', default: 0 })
  totalSpeakers: number;

  @Column({ type: 'int', default: 0 }) // Total speaking time in seconds
  totalSpeakingTimeSeconds: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  giftVolumeCoins: number;

  @Column({ type: 'int', default: 100 }) // Network quality score 0-100
  networkQualityScore: number;

  @Column({ type: 'jsonb', nullable: true })
  detailedStats: Record<string, unknown>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
