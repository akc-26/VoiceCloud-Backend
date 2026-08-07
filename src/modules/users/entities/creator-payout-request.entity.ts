import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { User } from './user.entity';
import { PayoutStatus, PayoutMethod } from '../../../common/enums';

const decimalTransformer = {
  to: (value: number) => value,
  from: (value: string | number) =>
    value === null || value === undefined ? 0 : Number(value),
};

const bigintTransformer = {
  to: (value: number) => value,
  from: (value: string | number) =>
    value === null || value === undefined ? 0 : Number(value),
};

@Entity('creator_payout_requests')
export class CreatorPayoutRequest {
  @ApiProperty({ description: 'Unique creator payout request ID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Creator user ID' })
  @Index('IDX_creator_payout_requests_creatorId')
  @Column({ type: 'uuid' })
  @IsUUID()
  creatorId: string;

  @ApiProperty({ description: 'Diamond amount requested for payout' })
  @Column({ type: 'bigint', default: 0, transformer: bigintTransformer })
  diamondAmount: number;

  @ApiProperty({ description: 'Payout currency amount in USD' })
  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  @IsNumber()
  payoutAmount: number;

  @ApiProperty({ enum: PayoutMethod, default: PayoutMethod.BANK_TRANSFER })
  @Column({ type: 'varchar', default: PayoutMethod.BANK_TRANSFER })
  @IsEnum(PayoutMethod)
  payoutMethod: PayoutMethod;

  @ApiPropertyOptional({ description: 'Account and payment details metadata' })
  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  @IsObject()
  accountDetails: Record<string, unknown>;

  @ApiProperty({ enum: PayoutStatus, default: PayoutStatus.PENDING })
  @Index('IDX_creator_payout_requests_status')
  @Column({ type: 'varchar', default: PayoutStatus.PENDING })
  @IsEnum(PayoutStatus)
  status: PayoutStatus;

  @ApiPropertyOptional({
    description: 'Admin user ID who reviewed the request',
  })
  @Column({ type: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  reviewedBy: string;

  @ApiPropertyOptional({ description: 'Timestamp when request was reviewed' })
  @Column({ type: 'timestamp', nullable: true })
  @IsOptional()
  reviewedAt: Date;

  @ApiPropertyOptional({
    description: 'Timestamp when payout funds were reserved',
  })
  @Column({ type: 'timestamp', nullable: true })
  reservedAt?: Date | null;

  @ApiPropertyOptional({
    description: 'Timestamp when payout was financially settled',
  })
  @Column({ type: 'timestamp', nullable: true })
  settledAt?: Date | null;

  @ApiPropertyOptional({
    description: 'Timestamp when reserved payout funds were released',
  })
  @Column({ type: 'timestamp', nullable: true })
  releasedAt?: Date | null;

  @ApiPropertyOptional({
    description: 'Persistent payout lifecycle operation group ID',
  })
  @Index('IDX_creator_payout_requests_operationGroupId')
  @Column({ type: 'varchar', nullable: true })
  operationGroupId?: string | null;

  @ApiPropertyOptional({ description: 'Persistent reserve operation key' })
  @Index('UQ_creator_payout_requests_reserveOperationKey', {
    unique: true,
    where: '"reserveOperationKey" IS NOT NULL',
  })
  @Column({ type: 'varchar', nullable: true })
  reserveOperationKey?: string | null;

  @ApiPropertyOptional({
    description: 'Reservation wallet ledger transaction ID',
  })
  @Column({ type: 'uuid', nullable: true })
  reservationTransactionId?: string | null;

  @ApiPropertyOptional({
    description: 'Settlement wallet ledger transaction ID',
  })
  @Column({ type: 'uuid', nullable: true })
  settlementTransactionId?: string | null;

  @ApiPropertyOptional({ description: 'Release wallet ledger transaction ID' })
  @Column({ type: 'uuid', nullable: true })
  releaseTransactionId?: string | null;

  @ApiPropertyOptional({
    description: 'Reason supplied when payout is rejected',
  })
  @Column({ type: 'text', nullable: true })
  rejectionReason?: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'creatorId' })
  creator: User;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'reviewedBy' })
  reviewer: User;
}
