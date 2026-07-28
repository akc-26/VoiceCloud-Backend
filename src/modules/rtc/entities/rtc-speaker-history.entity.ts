import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum SpeakerRole {
  HOST = 'host',
  MODERATOR = 'moderator',
  SPEAKER = 'speaker',
  LISTENER = 'listener',
}

@Entity('rtc_speaker_history')
export class RtcSpeakerHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar' })
  sessionId: string;

  @Index()
  @Column({ type: 'varchar' })
  roomId: string;

  @Index()
  @Column({ type: 'varchar' })
  userId: string;

  @Column({
    type: 'enum',
    enum: SpeakerRole,
    default: SpeakerRole.SPEAKER,
  })
  role: SpeakerRole;

  @Column({ type: 'int', default: 0 })
  seatIndex: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  joinedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  leftAt: Date;

  @Column({ type: 'int', default: 0 }) // Speaking duration in milliseconds
  speakingDurationMs: number;

  @Column({ type: 'boolean', default: false })
  isMuted: boolean;

  @Column({ type: 'int', default: 0 })
  reconnects: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
