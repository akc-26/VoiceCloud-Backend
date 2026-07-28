import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('rtc_quality_metrics')
export class RtcQualityMetric {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar' })
  roomId: string;

  @Index()
  @Column({ type: 'varchar' })
  userId: string;

  @Column({ type: 'varchar', nullable: true })
  sessionId: string;

  @Column({ type: 'int', default: 0 })
  bitrate: number; // in kbps

  @Column({ type: 'float', default: 0 })
  packetLoss: number; // percentage (0 - 100)

  @Column({ type: 'float', default: 0 })
  jitter: number; // in ms

  @Column({ type: 'float', default: 0 })
  rtt: number; // round trip time in ms

  @Column({ type: 'varchar', default: 'good' })
  connectionQuality: string; // excellent, good, fair, poor

  @Column({ type: 'int', default: 100 })
  participantNetworkScore: number; // 0 - 100 score

  @Column({ type: 'varchar', default: 'maintain' })
  adaptiveRecommendation: string; // maintain, reduce_bitrate_64k, reduce_bitrate_32k, enable_fec, change_server

  @CreateDateColumn()
  createdAt: Date;
}
