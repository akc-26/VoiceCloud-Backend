import { IsString, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CalculateEarningsDto {
  @ApiProperty({ description: 'Total gift coin value received', example: 1000 })
  @IsNumber()
  @Min(0)
  giftCoinsAmount: number;

  @ApiProperty({
    description: 'Country code of the creator/host',
    example: 'IN',
  })
  @IsString()
  countryCode: string;
}
