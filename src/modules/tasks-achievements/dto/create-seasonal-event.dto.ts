import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsDateString,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSeasonalEventDto {
  @ApiProperty({
    description: 'Season title',
    example: 'Summer Voice Festival 2026',
  })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Season description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Start ISO Date',
    example: '2026-06-01T00:00:00.000Z',
  })
  @IsDateString()
  startDate: string;

  @ApiProperty({
    description: 'End ISO Date',
    example: '2026-08-31T23:59:59.000Z',
  })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({
    description: 'XP Multiplier',
    default: 1.5,
    example: 1.5,
  })
  @IsNumber()
  @Min(0.1)
  @IsOptional()
  xpMultiplier?: number;

  @ApiPropertyOptional({
    description: 'Coin Multiplier',
    default: 1.2,
    example: 1.2,
  })
  @IsNumber()
  @Min(0.1)
  @IsOptional()
  coinMultiplier?: number;

  @ApiPropertyOptional({ description: 'Limited achievements JSON' })
  @IsString()
  @IsOptional()
  limitedAchievements?: string;

  @ApiPropertyOptional({ description: 'Seasonal rewards JSON' })
  @IsString()
  @IsOptional()
  rewards?: string;

  @ApiPropertyOptional({ description: 'Is active flag', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
