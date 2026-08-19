import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { HostVerificationAsset } from './host-verification-asset.entity';

export enum HostVerificationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  SUSPENDED = 'SUSPENDED',
}

@Entity('host_profiles')
export class HostProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  userId: string;

  @Column({ type: 'varchar' })
  realName: string;

  @Column({ type: 'varchar' })
  idNumber: string;

  @Column({ type: 'varchar' })
  documentUrl: string;

  @Column({ type: 'varchar' })
  selfieUrl: string;

  @Column({ type: 'text', nullable: true })
  bio: string;

  @Column('simple-array', { nullable: true })
  languages: string[];

  @Column('simple-array', { nullable: true })
  categories: string[];

  @Column({ type: 'varchar', nullable: true })
  country: string;

  @Column({ type: 'varchar', nullable: true })
  experience: string;

  @Column({ type: 'boolean', default: false })
  isFeatured: boolean;

  @Column({ type: 'text', nullable: true })
  availabilitySchedule: string | null;

  @Column({ type: 'varchar', default: HostVerificationStatus.PENDING })
  status: HostVerificationStatus;

  @Column({ type: 'int', default: 1 })
  hostLevel: number;

  @Column({ type: 'int', default: 0 })
  xp: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0.0 })
  performanceScore: number;

  @Column({ type: 'text', nullable: true })
  growthMilestones: string | null;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 5.0 })
  hostRating: number;

  @Column({ type: 'int', default: 1 })
  totalRatings: number;

  @Column({ type: 'int', default: 0 })
  followersCount: number;

  @Column({ type: 'int', default: 0 })
  totalRoomsHosted: number;

  @Column({ type: 'int', default: 0 })
  peakListeners: number;

  @Column({ type: 'int', default: 0 })
  totalSpeakingTimeMinutes: number;

  @Column({ type: 'int', default: 0 })
  totalAudience: number;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string | null;

  @OneToMany(() => HostVerificationAsset, (asset) => asset.hostProfile)
  verificationAssets?: HostVerificationAsset[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
