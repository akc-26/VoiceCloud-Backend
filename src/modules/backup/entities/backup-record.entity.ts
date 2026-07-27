import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum BackupType {
  FULL = 'FULL',
  INCREMENTAL = 'INCREMENTAL',
  MANUAL = 'MANUAL',
  SCHEDULED = 'SCHEDULED',
  EMERGENCY = 'EMERGENCY',
  PRE_UPGRADE = 'PRE_UPGRADE',
}

export enum BackupStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CORRUPTED = 'CORRUPTED',
  VERIFIED = 'VERIFIED',
}

@Entity('backup_records')
export class BackupRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Index()
  @Column({
    type: 'varchar',
    default: BackupType.MANUAL,
  })
  type: BackupType;

  @Index()
  @Column({
    type: 'varchar',
    default: BackupStatus.PENDING,
  })
  status: BackupStatus;

  @Column()
  filePath: string;

  @Column({ type: 'bigint', default: 0 })
  fileSizeOriginal: number;

  @Column({ type: 'bigint', default: 0 })
  fileSizeCompressed: number;

  @Column({ type: 'float', default: 1.0 })
  compressionRatio: number;

  @Column({ type: 'integer', default: 0 })
  durationMs: number;

  @Column({ nullable: true })
  checksum: string;

  @Column({ type: 'integer', default: 0 })
  fileCount: number;

  @Column({ default: true })
  isEncrypted: boolean;

  @Column({ default: 'AES-256-GCM' })
  encryptionAlgorithm: string;

  @Column({ default: 'local' })
  storageLocation: string; // 'local', 'usb', 'nas', 's3'

  @Column({ type: 'jsonb', default: [] })
  componentsIncluded: string[]; // ['database', 'redis', 'storage', 'config', 'ssl']

  @Column({ type: 'jsonb', nullable: true })
  verificationDetails?: {
    verifiedAt: string;
    archiveIntegrity: boolean;
    checksumMatches: boolean;
    databaseDumpValid: boolean;
    fileCountCheck: boolean;
    restoreValidated: boolean;
    logs: string[];
  };

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ nullable: true })
  createdBy?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
