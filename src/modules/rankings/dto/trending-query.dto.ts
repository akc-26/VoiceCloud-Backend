import { IsOptional, IsInt, Min, Max, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class TrendingQueryDto {
  @ApiPropertyOptional({ default: 10, description: 'Limit of items to return' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Category filter (users, hosts, agencies, clubs, rooms, all)',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Country filter ISO code' })
  @IsOptional()
  @IsString()
  country?: string;
}
