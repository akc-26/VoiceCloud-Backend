import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ApplicationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
}

@Entity('agency_applications')
export class AgencyApplication {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  agencyName: string;

  @Column({ type: 'varchar' })
  ownerId: string;

  @Column({ type: 'varchar' })
  legalName: string;

  @Column({ type: 'varchar' })
  taxId: string;

  @Column({ type: 'varchar' })
  businessRegistrationNumber: string;

  @Column({ type: 'text' })
  businessAddress: string;

  @Column({ type: 'varchar' })
  contactEmail: string;

  @Column({ type: 'varchar' })
  contactPhone: string;

  @Column({ type: 'varchar', nullable: true })
  website: string;

  @Column({ type: 'varchar' })
  country: string;

  @Column({ type: 'text', nullable: true })
  languages: string;

  @Column({ type: 'text', nullable: true })
  categories: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', nullable: true })
  documents: string; // JSON array of document URLs

  @Column({ type: 'varchar', default: ApplicationStatus.PENDING })
  status: ApplicationStatus;

  @Column({ type: 'text', nullable: true })
  reviewNotes: string;

  @Column({ type: 'varchar', nullable: true })
  reviewedBy: string;

  @Column({ type: 'timestamp', nullable: true })
  reviewedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
