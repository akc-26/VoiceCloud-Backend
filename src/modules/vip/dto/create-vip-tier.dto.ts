import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsArray,
  IsOptional,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';

export class CreateVipTierDto {
  @ApiProperty({ example: 'VIP 1 Silver' })
  @IsString()
  name: string;

  @ApiProperty({ example: 1, description: 'VIP Level (1 to 10)' })
  @IsNumber()
  @Min(1)
  @Max(10)
  level: number;

  @ApiPropertyOptional({ example: 'Silver Badge' })
  @IsOptional()
  @IsString()
  badge?: string;

  @ApiPropertyOptional({
    example: 'https://cdn.voicecloud.app/badges/silver.png',
  })
  @IsOptional()
  @IsString()
  badgeUrl?: string;

  @ApiPropertyOptional({
    example: 'https://cdn.voicecloud.app/icons/silver.png',
  })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({ example: '#C0C0C0' })
  @IsOptional()
  @IsString()
  colorTheme?: string;

  @ApiProperty({ example: 9.99 })
  @IsNumber()
  @Min(0)
  monthlyPrice: number;

  @ApiPropertyOptional({ example: 26.99 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  quarterlyPrice?: number;

  @ApiPropertyOptional({ example: 99.99 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  yearlyPrice?: number;

  @ApiPropertyOptional({ example: 9.99 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  durationDays?: number;

  @ApiPropertyOptional({
    example: ['animated_profile_frame', 'exclusive_badge'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  benefits?: string[];

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  activationStatus?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 'Standard silver level VIP tier' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

export { CreateVipTierDto as CreateVipPlanDto };
