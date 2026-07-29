import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SearchQueryDto } from './search-query.dto';

export class SearchAgenciesQueryDto extends SearchQueryDto {
  @ApiPropertyOptional({ description: 'Filter by status (ACTIVE, SUSPENDED)' })
  @IsOptional()
  @IsString()
  status?: string;
}
