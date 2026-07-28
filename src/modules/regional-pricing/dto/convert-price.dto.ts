import { IsString, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ConvertPriceDto {
  @ApiProperty({
    description: 'Coin price or local currency amount',
    example: 100,
  })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({
    description: 'Country code for target regional rates',
    example: 'IN',
  })
  @IsString()
  countryCode: string;
}
