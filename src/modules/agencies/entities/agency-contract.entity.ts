import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ContractStatus {
  PENDING_SIGNATURE = 'PENDING_SIGNATURE',
  ACTIVE = 'ACTIVE',
  TERMINATED = 'TERMINATED',
  EXPIRED = 'EXPIRED',
}

export enum CommissionModel {
  FIXED_PERCENTAGE = 'FIXED_PERCENTAGE',
  TIERED = 'TIERED',
  PERFORMANCE_BASED = 'PERFORMANCE_BASED',
}

@Entity('agency_contracts')
export class AgencyContract {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  agencyId: string;

  @Column({ type: 'varchar' })
  hostUserId: string;

  @Column({ type: 'varchar', nullable: true })
  recruiterUserId: string;

  @Column({ type: 'varchar', default: ContractStatus.PENDING_SIGNATURE })
  status: ContractStatus;

  @Column({ type: 'varchar', default: CommissionModel.FIXED_PERCENTAGE })
  commissionModel: CommissionModel;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 15.0 })
  commissionRate: number;

  @Column({ type: 'text', nullable: true })
  contractTerms: string;

  @Column({ type: 'timestamp', nullable: true })
  startDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  endDate: Date;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalGiftsReceived: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalDiamondsEarned: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
