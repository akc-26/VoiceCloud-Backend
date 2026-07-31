import { IsOptional, IsInt, Min, Max, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class RankingSnapshotQueryDto {
  @ApiPropertyOptional({
    description:
      'Category (users, hosts, agencies, clubs, rooms, vip, creators, trending)',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Timeframe (daily, weekly, monthly)' })
  @IsOptional()
  @IsString()
  timeframe?: string;

  @ApiPropertyOptional({
    description: 'Period identifier (e.g., 2026-07-29, 2026-W30)',
  })
  @IsOptional()
  @IsString()
  periodIdentifier?: string;

  @ApiPropertyOptional({ description: 'Country filter code' })
  @IsOptional()
  @IsString()
  country?: string;

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
}
