import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsEnum, IsOptional } from 'class-validator';
import { StoreCurrency } from '../entities/store-transaction.entity';

export class GiftStoreItemDto {
  @ApiProperty({ description: 'ID of item to gift' })
  @IsString()
  itemId: string;

  @ApiProperty({ description: 'Target user ID to receive gifted item' })
  @IsString()
  recipientId: string;

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
  })
  @IsOptional()
  @IsEnum(StoreCurrency)
  currency?: StoreCurrency;

  @ApiPropertyOptional({
    description: 'Custom message attached to gift',
    example: 'Happy Birthday! Enjoy this frame!',
  })
  @IsOptional()
  @IsString()
  giftMessage?: string;
}
