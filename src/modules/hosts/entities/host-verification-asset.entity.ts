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
import { User } from '../../users/entities/user.entity';
import { PrivateDocumentCategory } from '../../storage/enums/private-document-category.enum';
import {
  PrivateAssetValidationStatus,
  PrivateAssetVisibility,
} from '../../storage/enums/private-asset.enum';
import { HostProfile } from './host-profile.entity';

const bigintTransformer = {
  to: (value: number) => value,
  from: (value: string | number) =>
    value === null || value === undefined ? 0 : Number(value),
};

@Entity('host_verification_assets')
@Index('IDX_host_verification_assets_owner_category_active', [
  'ownerUserId',
  'category',
  'isActive',
])
@Index('IDX_host_verification_assets_host_category_active', [
  'hostProfileId',
  'category',
  'isActive',
])
export class HostVerificationAsset {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('IDX_host_verification_assets_ownerUserId')
  @Column({ type: 'uuid' })
  ownerUserId: string;

  @Index('IDX_host_verification_assets_hostProfileId')
  @Column({ type: 'uuid', nullable: true })
  hostProfileId: string | null;

  @Index('IDX_host_verification_assets_category')
  @Column({ type: 'varchar', length: 64 })
  category: PrivateDocumentCategory;

  @Column({ type: 'varchar', length: 255 })
  originalFilename: string;

  @Column({ type: 'varchar', length: 512, unique: true })
  storageKey: string;

  @Column({ type: 'varchar', length: 127 })
  verifiedMimeType: string;

  @Column({ type: 'varchar', length: 32 })
  verifiedFormat: string;

  @Column({ type: 'bigint', transformer: bigintTransformer })
  fileSize: number;

  @Column({ type: 'varchar', length: 64 })
  storageProvider: string;

  @Column({
    type: 'varchar',
    length: 16,
    default: PrivateAssetVisibility.PRIVATE,
  })
  visibility: PrivateAssetVisibility;

  @Column({
    type: 'varchar',
    length: 32,
    default: PrivateAssetValidationStatus.PENDING,
  })
  validationStatus: PrivateAssetValidationStatus;

  @Index('IDX_host_verification_assets_isActive')
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'timestamp', nullable: true })
  retiredAt: Date | null;

  @Column({ type: 'uuid', nullable: true })
  replacedByAssetId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ownerUserId' })
  owner: User;

  @ManyToOne(() => HostProfile, (profile) => profile.verificationAssets, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'hostProfileId' })
  hostProfile: HostProfile | null;

  @ManyToOne(() => HostVerificationAsset, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'replacedByAssetId' })
  replacedByAsset: HostVerificationAsset | null;
}
