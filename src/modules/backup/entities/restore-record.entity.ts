import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum RestoreStatus {
  PENDING = 'PENDING',
  PREVIEWING = 'PREVIEWING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  ROLLED_BACK = 'ROLLED_BACK',
}

@Entity('restore_records')
export class RestoreRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  backupId: string;

  @Column({
    type: 'varchar',
    default: RestoreStatus.PENDING,
  })
  status: RestoreStatus;

  @Column({ type: 'jsonb', default: [] })
  targetComponents: string[];

  @Column({ type: 'jsonb', nullable: true })
  restorePreview?: {
    backupName: string;
    totalFiles: number;
    dbTablesAffected: string[];
    configKeysAffected: number;
    estimatedTimeMs: number;
    integrityVerified: boolean;
  };

  @Column({ type: 'text', nullable: true })
  errorMessage?: string;

  @Column({ type: 'integer', default: 0 })
  durationMs: number;

  @Column({ nullable: true })
  operatorId?: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ nullable: true })
  completedAt?: Date;
}
