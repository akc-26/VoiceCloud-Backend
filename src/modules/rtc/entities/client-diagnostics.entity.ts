import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('client_diagnostics')
export class ClientDiagnostics {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar' })
  roomId: string;

  @Index()
  @Column({ type: 'varchar', nullable: true })
  userId: string | null;

  @Column({ type: 'float', nullable: true })
  latency: number | null;

  @Column({ type: 'float', nullable: true })
  jitter: number | null;

  @Column({ type: 'float', nullable: true })
  packetLoss: number | null;

  @Column({ type: 'int', nullable: true })
  audioBitrate: number | null;

  @Column({ type: 'varchar', nullable: true })
  audioCodec: string | null;

  @Column({ type: 'varchar', nullable: true })
  deviceModel: string | null;

  @Column({ type: 'varchar', nullable: true })
  osVersion: string | null;

  @Column({ type: 'varchar', nullable: true })
  appVersion: string | null;

  @Column({ type: 'timestamp', nullable: true })
  timestamp: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
