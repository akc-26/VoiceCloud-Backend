import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateGiftCategoryDto {
  @ApiProperty({ description: 'Category Name', example: 'Popular' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Category Slug', example: 'popular' })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Icon URL' })
  @IsOptional()
  @IsString()
  iconUrl?: string;

  @ApiPropertyOptional({ description: 'Sort Order', example: 0 })
  @IsOptional()
  @IsNumber()
  sortOrder?: number = 0;

  @ApiPropertyOptional({ description: 'Is Active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

  @ApiPropertyOptional({ description: 'Is VIP Only', default: false })
  @IsOptional()
  @IsBoolean()
  isVipOnly?: boolean = false;

  @ApiPropertyOptional({ description: 'Is Host Exclusive', default: false })
  @IsOptional()
  @IsBoolean()
  isHostExclusive?: boolean = false;

  @ApiPropertyOptional({ description: 'Is Agency Exclusive', default: false })
  @IsOptional()
  @IsBoolean()
  isAgencyExclusive?: boolean = false;
}
