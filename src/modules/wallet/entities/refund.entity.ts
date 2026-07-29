import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsObject,
} from 'class-validator';
import { User } from '../../users/entities/user.entity';
import { RefundStatus, RefundType } from '../../../common/enums';

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

@Entity('refunds')
export class Refund {
  @ApiProperty({ description: 'Unique refund ID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiPropertyOptional({ description: 'Purchase ID being refunded' })
  @Column({ type: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  purchaseId: string;

  @ApiProperty({ description: 'Target user ID' })
  @Index('IDX_refunds_userId')
  @Column({ type: 'uuid' })
  @IsUUID()
  userId: string;

  @ApiPropertyOptional({ description: 'Associated transaction ID' })
  @Column({ type: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  transactionId: string;

  @ApiProperty({ enum: RefundType, default: RefundType.FULL })
  @Column({ type: 'varchar', default: RefundType.FULL })
  @IsEnum(RefundType)
  refundType: RefundType;

  @ApiProperty({ description: 'Refund amount in fiat currency' })
  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  @IsNumber()
  amount: number;

  @ApiProperty({ description: 'Currency code' })
  @Column({ type: 'varchar', default: 'USD' })
  @IsString()
  currency: string;

  @ApiProperty({ description: 'Coins deducted during refund rollback' })
  @Column({ type: 'bigint', default: 0, transformer: bigintTransformer })
  coinsDeducted: number;

  @ApiProperty({ enum: RefundStatus, default: RefundStatus.PENDING })
  @Index('IDX_refunds_status')
  @Column({ type: 'varchar', default: RefundStatus.PENDING })
  @IsEnum(RefundStatus)
  status: RefundStatus;

  @ApiPropertyOptional({ description: 'Refund reason' })
  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  reason: string;

  @ApiPropertyOptional({ description: 'Admin or system process ID' })
  @Column({ type: 'varchar', nullable: true })
  @IsOptional()
  @IsString()
  processedBy: string;

  @ApiPropertyOptional({ description: 'Arbitrary refund metadata' })
  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  @IsObject()
  metadata: Record<string, unknown>;

  @CreateDateColumn()
  @Index('IDX_refunds_createdAt')
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}
