import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

const decimalTransformer = {
  to: (value: number) => value,
  from: (value: string | number) =>
    value === null || value === undefined ? 0 : Number(value),
};

export enum HostSettlementRequestStatus {
  PENDING = 'PENDING',
  SETTLED = 'SETTLED',
}

@Entity('host_settlement_requests')
export class HostSettlementRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('IDX_host_settlement_requests_hostProfileId')
  @Column({ type: 'varchar' })
  hostProfileId: string;

  @Index('IDX_host_settlement_requests_userId')
  @Column({ type: 'varchar' })
  userId: string;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: decimalTransformer,
  })
  amount: number;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  settledAmount: number;

  @Index('IDX_host_settlement_requests_status')
  @Column({ type: 'varchar', default: HostSettlementRequestStatus.PENDING })
  status: HostSettlementRequestStatus;

  @Index('IDX_host_settlement_requests_operationGroupId')
  @Column({ type: 'varchar' })
  operationGroupId: string;

  @Index('UQ_host_settlement_requests_reserveOperationKey', { unique: true })
  @Column({ type: 'varchar' })
  reserveOperationKey: string;

  @Column({ type: 'uuid', nullable: true })
  reservationTransactionId: string | null;

  @Column({ type: 'timestamp', nullable: true })
  settledAt: Date | null;

  @Column({ type: 'varchar', nullable: true })
  settledBy: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
