import { IsOptional, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SearchQueryDto } from './search-query.dto';

export class SearchUsersQueryDto extends SearchQueryDto {
  @ApiPropertyOptional({ description: 'Filter by online status' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isOnline?: boolean;

  @ApiPropertyOptional({ description: 'Filter by verified host/user status' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isVerified?: boolean;

  @ApiPropertyOptional({ description: 'Filter by VIP membership status' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isVip?: boolean;
}
