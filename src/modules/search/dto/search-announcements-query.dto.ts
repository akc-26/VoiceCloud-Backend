import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SearchQueryDto } from './search-query.dto';

export class SearchAnnouncementsQueryDto extends SearchQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by target audience (GLOBAL, VIP, AGENCY, HOST)',
  })
  @IsOptional()
  @IsString()
  targetAudience?: string;

  @ApiPropertyOptional({
    description: 'Filter by priority (LOW, MEDIUM, HIGH, URGENT)',
  })
  @IsOptional()
  @IsString()
  priority?: string;
}
