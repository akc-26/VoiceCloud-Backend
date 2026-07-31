import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('voice_notes')
export class VoiceNote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  messageId: string;

  @Column()
  url: string;

  @Column({ type: 'float', default: 0 })
  duration: number;

  @Column({ type: 'jsonb', nullable: true })
  waveform: number[];

  @Column({ nullable: true })
  mimeType: string;

  @Column({ type: 'int', nullable: true })
  fileSize: number;

  @CreateDateColumn()
  createdAt: Date;
}
