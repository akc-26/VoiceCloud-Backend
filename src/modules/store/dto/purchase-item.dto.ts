import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsEnum, IsOptional } from 'class-validator';
import { StoreCurrency } from '../entities/store-transaction.entity';

export class PurchaseStoreItemDto {
  @ApiProperty({ description: 'ID of item to purchase' })
  @IsString()
  itemId: string;

  @ApiPropertyOptional({
    description: 'Rental duration in days (e.g. 7, 30, -1 for permanent)',
    example: 30,
  })
  @IsOptional()
  @IsNumber()
  durationDays?: number;

  @ApiPropertyOptional({
    enum: StoreCurrency,
    default: StoreCurrency.COINS,
    example: StoreCurrency.COINS,
  })
  @IsOptional()
  @IsEnum(StoreCurrency)
  currency?: StoreCurrency;
}
