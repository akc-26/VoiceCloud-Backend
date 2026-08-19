import {
  IsOptional,
  IsString,
  IsInt,
  Min,
  Max,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum SearchEntityType {
  ALL = 'all',
  USERS = 'users',
  ROOMS = 'rooms',
  HOSTS = 'hosts',
  GIFTS = 'gifts',
  ANNOUNCEMENTS = 'announcements',
}

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

export class SearchQueryDto {
  @ApiPropertyOptional({ description: 'Keyword to search for' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({
    enum: SearchEntityType,
    default: SearchEntityType.ALL,
    description: 'Filter by entity type',
  })
  @IsOptional()
  @IsEnum(SearchEntityType)
  type?: SearchEntityType = SearchEntityType.ALL;

  @ApiPropertyOptional({ default: 1, description: 'Page number' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, description: 'Items per page' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Sort field' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ enum: SortOrder, default: SortOrder.DESC })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.DESC;

  @ApiPropertyOptional({
    description: 'Match only terms starting with query string',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  prefixOnly?: boolean = false;

  @ApiPropertyOptional({
    description: 'Match partial terms containing query string',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  partialMatch?: boolean = true;
}
