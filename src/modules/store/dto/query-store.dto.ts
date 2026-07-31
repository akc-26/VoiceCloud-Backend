import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsEnum,
  IsBoolean,
  IsNumber,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { StoreCategory, ItemRarity } from '../entities/store-item.entity';

export class QueryStoreCatalogDto {
  @ApiPropertyOptional({ enum: StoreCategory })
  @IsOptional()
  @IsEnum(StoreCategory)
  category?: StoreCategory;

  @ApiPropertyOptional({ enum: ItemRarity })
  @IsOptional()
  @IsEnum(ItemRarity)
  rarity?: ItemRarity;

  @ApiPropertyOptional({ description: 'Search keyword' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter VIP exclusive items' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isVipExclusive?: boolean;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 20;
}

export class QueryUserInventoryDto {
  @ApiPropertyOptional({ enum: StoreCategory })
  @IsOptional()
  @IsEnum(StoreCategory)
  category?: StoreCategory;

  @ApiPropertyOptional({ description: 'Filter only equipped items' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  equippedOnly?: boolean;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 20;
}
