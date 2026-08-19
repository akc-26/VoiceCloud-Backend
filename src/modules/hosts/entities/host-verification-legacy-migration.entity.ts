import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PrivateDocumentCategory } from '../../storage/enums/private-document-category.enum';
import { HostProfile } from './host-profile.entity';
import { HostVerificationAsset } from './host-verification-asset.entity';

export enum LegacyHostAssetMigrationStatus {
  MIGRATED = 'MIGRATED',
  REQUIRES_REUPLOAD = 'REQUIRES_REUPLOAD',
}

@Entity('host_verification_legacy_migrations')
@Index(
  'UQ_host_verification_legacy_migrations_host_category',
  ['hostProfileId', 'category'],
  { unique: true },
)
export class HostVerificationLegacyMigration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('IDX_host_verification_legacy_migrations_hostProfileId')
  @Column({ type: 'uuid' })
  hostProfileId: string;

  @Index('IDX_host_verification_legacy_migrations_ownerUserId')
  @Column({ type: 'uuid' })
  ownerUserId: string;

  @Column({ type: 'varchar', length: 64 })
  category: PrivateDocumentCategory;

  @Column({ type: 'char', length: 64 })
  sourceFingerprint: string;

  @Column({ type: 'varchar', length: 255 })
  sourceFilename: string;

  @Column({ type: 'varchar', length: 512, nullable: true })
  quarantineStorageKey: string | null;

  @Index('IDX_host_verification_legacy_migrations_status')
  @Column({ type: 'varchar', length: 32 })
  status: LegacyHostAssetMigrationStatus;

  @Column({ type: 'uuid', nullable: true })
  assetId: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  failureCode: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  failureDetail: string | null;

  @Column({ type: 'timestamp', nullable: true })
  publicSourceRetiredAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => HostProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'hostProfileId' })
  hostProfile: HostProfile;

  @ManyToOne(() => HostVerificationAsset, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'assetId' })
  asset: HostVerificationAsset | null;
}
