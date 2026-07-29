import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsEnum,
  IsInt,
  IsString,
  IsUUID,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  WalletTransactionType,
  WalletCurrency,
  WalletTransactionStatus,
} from '../../../common/enums';

export class LedgerQueryDto {
  @ApiPropertyOptional({ description: 'Filter by user ID' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({
    enum: WalletTransactionType,
    description: 'Filter by transaction type',
  })
  @IsOptional()
  @IsEnum(WalletTransactionType)
  transactionType?: WalletTransactionType;

  @ApiPropertyOptional({
    enum: WalletCurrency,
    description: 'Filter by currency',
  })
  @IsOptional()
  @IsEnum(WalletCurrency)
  currency?: WalletCurrency;

  @ApiPropertyOptional({
    enum: WalletTransactionStatus,
    description: 'Filter by status',
  })
  @IsOptional()
  @IsEnum(WalletTransactionStatus)
  status?: WalletTransactionStatus;

  @ApiPropertyOptional({ description: 'Filter by source' })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({ description: 'Filter by destination' })
  @IsOptional()
  @IsString()
  destination?: string;

  @ApiPropertyOptional({ description: 'Search term' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['ASC', 'DESC'],
    default: 'DESC',
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}
