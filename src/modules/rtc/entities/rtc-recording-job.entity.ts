import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum RecordingJobStatus {
  PENDING = 'pending',
  RECORDING = 'recording',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('rtc_recording_jobs')
export class RtcRecordingJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar' })
  sessionId: string;

  @Index()
  @Column({ type: 'varchar' })
  roomId: string;

  @Column({ type: 'varchar', default: 'default_mock' })
  provider: string;

  @Column({ type: 'varchar', nullable: true })
  providerJobId: string;

  @Column({
    type: 'enum',
    enum: RecordingJobStatus,
    default: RecordingJobStatus.PENDING,
  })
  status: RecordingJobStatus;

  @Column({ type: 'varchar', nullable: true })
  recordingUrl: string;

  @Column({ type: 'int', default: 0 }) // Duration in seconds
  durationSeconds: number;

  @Column({ type: 'bigint', default: 0 }) // File size in bytes
  fileSizeBytes: number;

  @Column({ type: 'varchar', default: 'pending' }) // Upload status to storage
  uploadStatus: string;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
