import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum AgencyStatus {
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  REJECTED = 'REJECTED',
}

@Entity('agencies')
export class Agency {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar', unique: true })
  code: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', nullable: true })
  logoUrl: string;

  @Column({ type: 'varchar', nullable: true })
  bannerUrl: string;

  @Column({ type: 'varchar' })
  ownerId: string;

  @Column({ type: 'varchar', default: AgencyStatus.ACTIVE })
  status: AgencyStatus;

  // Legal & Business Info
  @Column({ type: 'varchar', nullable: true })
  legalName: string;

  @Column({ type: 'varchar', nullable: true })
  taxId: string;

  @Column({ type: 'varchar', nullable: true })
  businessRegistrationNumber: string;

  @Column({ type: 'text', nullable: true })
  businessAddress: string;

  @Column({ type: 'varchar', nullable: true })
  contactEmail: string;

  @Column({ type: 'varchar', nullable: true })
  contactPhone: string;

  @Column({ type: 'varchar', nullable: true })
  website: string;

  @Column({ type: 'varchar', nullable: true })
  country: string;

  @Column({ type: 'text', nullable: true })
  languages: string; // Comma-separated or JSON string

  @Column({ type: 'text', nullable: true })
  categories: string; // Comma-separated or JSON string

  @Column({ type: 'text', nullable: true })
  socialLinks: string; // JSON string

  @Column({ type: 'boolean', default: false })
  isVerified: boolean;

  @Column({ type: 'boolean', default: false })
  featured: boolean;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 15.0 })
  commissionRate: number; // Agency commission %

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 5.0 })
  rating: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalRevenue: number;

  @Column({ type: 'int', default: 1 })
  memberCount: number;

  @Column({ type: 'int', default: 0 })
  totalHosts: number;

  @Column({ type: 'int', default: 0 })
  activeHosts: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
