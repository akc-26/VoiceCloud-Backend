import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsArray,
  IsDateString,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDynamicGiftDto {
  @ApiProperty({ description: 'Gift Name', example: 'Summer Dragon Firework' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Gift Category', example: 'Seasonal' })
  @IsOptional()
  @IsString()
  category?: string = 'General';

  @ApiProperty({ description: 'Price in coins', example: 500 })
  @IsNumber()
  @Min(1)
  coinPrice: number;

  @ApiPropertyOptional({ description: 'Icon URL' })
  @IsOptional()
  @IsString()
  iconUrl?: string;

  @ApiPropertyOptional({ description: 'Animation / FX URL' })
  @IsOptional()
  @IsString()
  animationUrl?: string;

  @ApiPropertyOptional({ description: 'Allowed Country Codes (e.g., ["US", "IN"])' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedCountries?: string[];

  @ApiPropertyOptional({ description: 'Start date for gift availability' })
  @IsOptional()
  @IsDateString()
  availableFrom?: string;

  @ApiPropertyOptional({ description: 'End date for gift availability' })
  @IsOptional()
  @IsDateString()
  availableUntil?: string;

  @ApiPropertyOptional({ description: 'Is limited edition gift with stock count' })
  @IsOptional()
  @IsBoolean()
  isLimitedEdition?: boolean = false;

  @ApiPropertyOptional({ description: 'Total initial stock for limited edition' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  totalStock?: number;

  @ApiPropertyOptional({ description: 'Is seasonal gift' })
  @IsOptional()
  @IsBoolean()
  isSeasonal?: boolean = false;

  @ApiPropertyOptional({ description: 'Season tag (e.g. summer_2026, ramadan)' })
  @IsOptional()
  @IsString()
  seasonTag?: string;
}
