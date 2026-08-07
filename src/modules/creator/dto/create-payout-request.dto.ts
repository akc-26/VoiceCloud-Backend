import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, Min, IsEnum, IsOptional, IsObject, IsString, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { PayoutMethod } from '../../../common/enums';

export class CreatePayoutRequestDto {
  @ApiProperty({
    description: 'Diamond amount requested for payout',
    example: 1000,
  })
  @Type(() => Number)
  @IsInt()
  @Min(100)
  diamondAmount: number;

  @ApiProperty({ enum: PayoutMethod, example: PayoutMethod.BANK_TRANSFER })
  @IsEnum(PayoutMethod)
  payoutMethod: PayoutMethod;

  @ApiPropertyOptional({ description: 'Account and payment details metadata' })
  @IsOptional()
  @IsObject()
  accountDetails?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Optional idempotency key for safe payout request retries',
  })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  operationKey?: string;
}
