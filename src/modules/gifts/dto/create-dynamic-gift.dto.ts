import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsArray,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDynamicGiftDto {
  @ApiProperty({ description: 'Gift Name', example: 'Summer Dragon Firework' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Gift Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description:
      'Gift Type (static, animated, svga, lottie, video, premium, limited, seasonal, country_specific, hidden)',
    example: 'svga',
  })
  @IsOptional()
  @IsString()
  type?: string = 'static';

  @ApiPropertyOptional({
    description: 'Gift Rarity (common, rare, epic, legendary, mythic)',
    example: 'epic',
  })
  @IsOptional()
  @IsString()
  rarity?: string = 'common';

  @ApiPropertyOptional({ description: 'Gift Category', example: 'Popular' })
  @IsOptional()
  @IsString()
  category?: string = 'Popular';

  @ApiProperty({ description: 'Price in coins', example: 500 })
  @IsNumber()
  @Min(1)
  coinPrice: number;

  @ApiPropertyOptional({
    description: 'Creator Earnings Percentage',
    example: 70.0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  creatorEarningsPercentage?: number = 70.0;

  @ApiPropertyOptional({ description: 'Icon URL' })
  @IsOptional()
  @IsString()
  iconUrl?: string;

  @ApiPropertyOptional({ description: 'Animation / FX URL' })
  @IsOptional()
  @IsString()
  animationUrl?: string;

  @ApiPropertyOptional({ description: 'Preview Image URL' })
  @IsOptional()
  @IsString()
  previewUrl?: string;

  @ApiPropertyOptional({ description: 'Is Gift Active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

  @ApiPropertyOptional({ description: 'Is Gift Archived', default: false })
  @IsOptional()
  @IsBoolean()
  isArchived?: boolean = false;

  @ApiPropertyOptional({
    description: 'Is Gift Hidden from general catalog',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isHidden?: boolean = false;

  @ApiPropertyOptional({ description: 'Is VIP Only', default: false })
  @IsOptional()
  @IsBoolean()
  isVipOnly?: boolean = false;

  @ApiPropertyOptional({ description: 'Is Host Exclusive', default: false })
  @IsOptional()
  @IsBoolean()
  isHostExclusive?: boolean = false;

  @ApiPropertyOptional({
    description: 'Allowed Country Codes (e.g., ["US", "IN"])',
  })
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

  @ApiPropertyOptional({
    description: 'Is limited edition gift with stock count',
  })
  @IsOptional()
  @IsBoolean()
  isLimitedEdition?: boolean = false;

  @ApiPropertyOptional({
    description: 'Total initial stock for limited edition',
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  totalStock?: number;

  @ApiPropertyOptional({ description: 'Is seasonal gift' })
  @IsOptional()
  @IsBoolean()
  isSeasonal?: boolean = false;

  @ApiPropertyOptional({
    description: 'Season tag (e.g. summer_2026, ramadan)',
  })
  @IsOptional()
  @IsString()
  seasonTag?: string;

  @ApiPropertyOptional({
    description: 'Display / Sort order in catalog',
    example: 0,
  })
  @IsOptional()
  @IsNumber()
  sortOrder?: number = 0;

  @ApiPropertyOptional({ description: 'Tags list for filtering' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
