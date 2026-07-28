import { IsBoolean, IsOptional, IsObject } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class RecordVisitDto {
  @ApiPropertyOptional({ example: false, description: 'Force visit as anonymous' })
  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean;

  @ApiPropertyOptional({ example: { source: 'search', device: 'iOS' } })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
