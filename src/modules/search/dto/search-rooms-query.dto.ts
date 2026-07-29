import { IsOptional, IsBoolean, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SearchQueryDto } from './search-query.dto';

export class SearchRoomsQueryDto extends SearchQueryDto {
  @ApiPropertyOptional({ description: 'Filter by locked state' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isLocked?: boolean;

  @ApiPropertyOptional({ description: 'Filter by live status' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isLive?: boolean;

  @ApiPropertyOptional({ description: 'Filter by room language' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ description: 'Filter by room category' })
  @IsOptional()
  @IsString()
  category?: string;
}
