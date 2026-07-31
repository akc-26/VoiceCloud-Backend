import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsIn,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AdminAdjustLevelDto {
  @ApiProperty({ example: 'wealth', enum: ['wealth', 'charm'] })
  @IsString()
  @IsIn(['wealth', 'charm'])
  type: 'wealth' | 'charm';

  @ApiProperty({ example: 10, description: 'Target level (1 - 100)' })
  @IsNumber()
  @Min(1)
  @Max(100)
  level: number;

  @ApiPropertyOptional({
    example: 5000,
    description: 'Optional experience points override',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  exp?: number;
}

export class CreateBadgeDto {
  @ApiProperty({
    example: 'Top-Giver-2026',
    description: 'Unique badge code identifier',
  })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: 'Top Giver 2026', description: 'Badge display name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Awarded to top donors of 2026' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/badges/top-giver.png',
  })
  @IsOptional()
  @IsString()
  iconUrl?: string;

  @ApiProperty({
    example: 'wealth',
    description: 'wealth | charm | event | vip | creator | system',
  })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}
