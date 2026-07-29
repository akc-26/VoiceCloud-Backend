import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsInt, IsString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { WalletTransactionType, WalletCurrency } from '../../../common/enums';

export class TransactionQueryDto {
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
    description: 'Sort order by creation time',
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
