import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsEnum, IsOptional } from 'class-validator';
import { StoreItem } from './store-item.entity';

export enum StoreTransactionType {
  PURCHASE = 'PURCHASE',
  GIFT = 'GIFT',
  ADMIN_GRANT = 'ADMIN_GRANT',
}

export enum StoreCurrency {
  COINS = 'COINS',
  DIAMONDS = 'DIAMONDS',
  FREE = 'FREE',
}

@Entity('store_transactions')
export class StoreTransaction {
  @ApiProperty({ description: 'Unique transaction ID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Purchaser / Sender User ID' })
  @Index()
  @Column({ type: 'varchar' })
  @IsString()
  userId: string;

  @ApiPropertyOptional({ description: 'Recipient User ID if gifted' })
  @Index()
  @Column({ type: 'varchar', nullable: true })
  @IsOptional()
  @IsString()
  recipientId?: string;

  @ApiProperty({ description: 'Store Item ID' })
  @Index()
  @Column({ type: 'varchar' })
  @IsString()
  itemId: string;

  @ManyToOne(() => StoreItem, { eager: true })
  @JoinColumn({ name: 'itemId' })
  item: StoreItem;

  @ApiProperty({
    enum: StoreTransactionType,
    default: StoreTransactionType.PURCHASE,
  })
  @Column({ type: 'varchar', default: StoreTransactionType.PURCHASE })
  @IsEnum(StoreTransactionType)
  transactionType: StoreTransactionType;

  @ApiProperty({ enum: StoreCurrency, default: StoreCurrency.COINS })
  @Column({ type: 'varchar', default: StoreCurrency.COINS })
  @IsEnum(StoreCurrency)
  currency: StoreCurrency;

  @ApiProperty({ description: 'Amount paid' })
  @Column({ type: 'int', default: 0 })
  @IsNumber()
  amount: number;

  @ApiProperty({ description: 'Rental duration in days (-1 for permanent)' })
  @Column({ type: 'int', default: 30 })
  @IsNumber()
  durationDays: number;

  @ApiPropertyOptional({ description: 'Calculated expiration timestamp' })
  @Column({ type: 'timestamp', nullable: true })
  @IsOptional()
  expiresAt?: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
