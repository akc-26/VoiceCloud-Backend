import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SearchQueryDto } from './search-query.dto';

export class SearchHostsQueryDto extends SearchQueryDto {
  @ApiPropertyOptional({
    description:
      'Filter by verification status (APPROVED, PENDING, REJECTED, SUSPENDED)',
  })
  @IsOptional()
  @IsString()
  status?: string;
}
