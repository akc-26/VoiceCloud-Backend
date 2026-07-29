import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum RtcSessionStatus {
  STARTING = 'starting',
  ACTIVE = 'active',
  ENDED = 'ended',
  FAILED = 'failed',
}

export enum AudioQualityProfile {
  SPEECH = 'speech',
  MUSIC = 'music',
  GAMING = 'gaming',
  LOW_BANDWIDTH = 'low_bandwidth',
  HIGH_QUALITY = 'high_quality',
  ULTRA_LOW_LATENCY = 'ultra_low_latency',
}

@Entity('rtc_sessions')
export class RtcSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar' })
  roomId: string;

  @Index()
  @Column({ type: 'varchar' })
  hostId: string;

  @Column({ type: 'varchar', default: 'default_mock' })
  provider: string;

  @Column({
    type: 'enum',
    enum: RtcSessionStatus,
    default: RtcSessionStatus.ACTIVE,
  })
  status: RtcSessionStatus;

  @Column({
    type: 'enum',
    enum: AudioQualityProfile,
    default: AudioQualityProfile.SPEECH,
  })
  qualityProfile: AudioQualityProfile;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  startTime: Date;

  @Column({ type: 'timestamp', nullable: true })
  endTime: Date;

  @Column({ type: 'int', default: 0 }) // Duration in seconds
  durationSeconds: number;

  @Column({ type: 'int', default: 0 })
  peakAudience: number;

  @Column({ type: 'int', default: 0 })
  concurrentUsers: number;

  @Column({ type: 'int', default: 0 })
  totalParticipants: number;

  @Column({ type: 'int', default: 0 })
  reconnectionCount: number;

  @Column({ type: 'jsonb', nullable: true })
  activeSpeakersList: string[];

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
