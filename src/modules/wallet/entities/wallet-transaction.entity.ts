import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
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
import { WalletBalance } from './wallet-balance.entity';
import { User } from '../../users/entities/user.entity';
import {
  WalletTransactionType,
  WalletCurrency,
  WalletTransactionStatus,
} from '../../../common/enums';

const decimalTransformer = {
  to: (value: number) => value,
  from: (value: string | number) =>
    value === null || value === undefined ? 0 : Number(value),
};

@Entity('wallet_transactions')
export class WalletTransaction {
  @ApiProperty({ description: 'Unique transaction ID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Associated wallet balance ID' })
  @Index('IDX_wallet_transactions_walletId')
  @Column({ type: 'uuid' })
  @IsUUID()
  walletId: string;

  @ApiProperty({ description: 'Associated user ID' })
  @Index('IDX_wallet_transactions_userId')
  @Column({ type: 'uuid' })
  @IsUUID()
  userId: string;

  @ApiProperty({
    enum: WalletTransactionType,
    default: WalletTransactionType.PURCHASE,
  })
  @Index('IDX_wallet_transactions_transactionType')
  @Column({ type: 'varchar', default: WalletTransactionType.PURCHASE })
  @IsEnum(WalletTransactionType)
  transactionType: WalletTransactionType;

  @ApiProperty({ description: 'Transaction amount' })
  @Column({
    type: 'numeric',
    precision: 14,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  @IsNumber()
  amount: number;

  @ApiProperty({ enum: WalletCurrency, default: WalletCurrency.COIN })
  @Column({ type: 'varchar', default: WalletCurrency.COIN })
  @IsEnum(WalletCurrency)
  currency: WalletCurrency;

  @ApiPropertyOptional({
    description:
      'Type of entity or source referenced (e.g. COIN_PACKAGE, GIFT)',
  })
  @Column({ type: 'varchar', nullable: true })
  @IsOptional()
  @IsString()
  referenceType: string;

  @ApiPropertyOptional({ description: 'ID of referenced item' })
  @Column({ type: 'varchar', nullable: true })
  @IsOptional()
  @IsString()
  referenceId: string;

  @ApiProperty({
    enum: WalletTransactionStatus,
    default: WalletTransactionStatus.COMPLETED,
  })
  @Index('IDX_wallet_transactions_status')
  @Column({ type: 'varchar', default: WalletTransactionStatus.COMPLETED })
  @IsEnum(WalletTransactionStatus)
  status: WalletTransactionStatus;

  @ApiPropertyOptional({
    description: 'Human readable transaction description',
  })
  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  description: string;

  @ApiPropertyOptional({ description: 'Arbitrary transaction metadata' })
  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  @IsObject()
  metadata: Record<string, unknown>;

  @CreateDateColumn()
  @Index('IDX_wallet_transactions_createdAt')
  createdAt: Date;

  @ManyToOne(() => WalletBalance, (wb) => wb.transactions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'walletId' })
  wallet: WalletBalance;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}
