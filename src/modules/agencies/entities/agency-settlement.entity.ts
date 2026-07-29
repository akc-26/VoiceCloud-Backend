import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum SettlementStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
  FAILED = 'FAILED',
}

@Entity('agency_settlements')
export class AgencySettlement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  agencyId: string;

  @Column({ type: 'varchar' })
  settlementPeriod: string; // e.g. "2026-07"

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  grossRevenue: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  creatorEarnings: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  agencyCommission: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  platformCommission: number;

  @Column({ type: 'varchar', default: SettlementStatus.PENDING })
  status: SettlementStatus;

  @Column({ type: 'varchar', nullable: true })
  payoutMethod: string;

  @Column({ type: 'varchar', nullable: true })
  paymentReference: string;

  @Column({ type: 'text', nullable: true })
  reviewNotes: string;

  @Column({ type: 'varchar', nullable: true })
  processedBy: string;

  @Column({ type: 'timestamp', nullable: true })
  processedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
