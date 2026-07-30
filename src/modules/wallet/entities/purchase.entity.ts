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
} from 'class-validator';
import { User } from '../../users/entities/user.entity';
import { PaymentProviderType, PurchaseStatus } from '../../../common/enums';

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

@Entity('purchases')
export class Purchase {
  @ApiProperty({ description: 'Unique purchase ID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'User ID owner of purchase' })
  @Index('IDX_purchases_userId')
  @Column({ type: 'uuid' })
  @IsUUID()
  userId: string;

  @ApiPropertyOptional({ description: 'Coin package ID' })
  @Column({ type: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  packageId: string;

  @ApiProperty({ enum: PaymentProviderType })
  @Column({ type: 'varchar' })
  @IsEnum(PaymentProviderType)
  provider: PaymentProviderType;

  @ApiProperty({ description: 'Provider order or transaction reference' })
  @Index('IDX_purchases_transactionId')
  @Column({ type: 'varchar' })
  @IsString()
  transactionId: string;

  @ApiProperty({ description: 'Unique idempotency key to prevent replay' })
  @Index('IDX_purchases_idempotencyKey', { unique: true })
  @Column({ type: 'varchar', unique: true })
  @IsString()
  idempotencyKey: string;

  @ApiProperty({ description: 'Purchase price amount' })
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

  @ApiProperty({ description: 'Base coins granted' })
  @Column({ type: 'bigint', default: 0, transformer: bigintTransformer })
  coinsGranted: number;

  @ApiProperty({ description: 'Bonus coins granted' })
  @Column({ type: 'bigint', default: 0, transformer: bigintTransformer })
  bonusGranted: number;

  @ApiProperty({ enum: PurchaseStatus, default: PurchaseStatus.INITIATED })
  @Index('IDX_purchases_status')
  @Column({ type: 'varchar', default: PurchaseStatus.INITIATED })
  @IsEnum(PurchaseStatus)
  status: PurchaseStatus;

  @ApiPropertyOptional({ description: 'Raw receipt token or payload' })
  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  receipt: string;

  @ApiPropertyOptional({ description: 'Receipt signature' })
  @Column({ type: 'varchar', nullable: true })
  @IsOptional()
  @IsString()
  signature: string;

  @ApiPropertyOptional({ description: 'Error message if failed' })
  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  errorMessage: string;

  @CreateDateColumn()
  @Index('IDX_purchases_createdAt')
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}
