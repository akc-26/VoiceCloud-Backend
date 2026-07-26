import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsArray,
  IsOptional,
  IsBoolean,
  Min,
} from 'class-validator';

export class CreateVipPlanDto {
  @ApiProperty({ example: 'VIP Gold' })
  @IsString()
  name: string;

  @ApiProperty({ example: 2 })
  @IsNumber()
  @Min(1)
  level: number;

  @ApiPropertyOptional({
    example: 'https://cdn.voicecloud.app/badges/gold.png',
  })
  @IsOptional()
  @IsString()
  badgeUrl?: string;

  @ApiProperty({ example: 49.99 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ example: 30 })
  @IsNumber()
  @Min(1)
  durationDays: number;

  @ApiPropertyOptional({
    example: ['Gold Badge', 'Exclusive Entrance', '2x XP Boost'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  benefits?: string[];

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
