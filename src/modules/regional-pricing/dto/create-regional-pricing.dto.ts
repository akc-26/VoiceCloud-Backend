import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRegionalPricingDto {
  @ApiProperty({ description: 'Two-letter ISO Country Code', example: 'IN' })
  @IsString()
  countryCode: string;

  @ApiProperty({ description: 'Country Name', example: 'India' })
  @IsString()
  countryName: string;

  @ApiProperty({ description: 'Currency Code', example: 'INR' })
  @IsString()
  currencyCode: string;

  @ApiProperty({
    description: 'Exchange rate: How many coins 1 unit of local currency buys',
    example: 10,
  })
  @IsNumber()
  @Min(0.0001)
  exchangeRateToCoin: number;

  @ApiPropertyOptional({
    description: 'Local tax percentage (e.g., 18 for 18%)',
    example: 18,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  localTaxPercentage?: number = 0;

  @ApiPropertyOptional({
    description: 'Creator earning share rate (0.0 to 1.0)',
    example: 0.7,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  creatorEarningShareRate?: number = 0.7;

  @ApiPropertyOptional({
    description: 'Is active for regional users',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}
