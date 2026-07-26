import { IsOptional, IsEnum, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  AnnouncementTarget,
  AnnouncementPriority,
} from '../entities/announcement.entity';

export class QueryAnnouncementDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 20;

  @ApiPropertyOptional({ enum: AnnouncementTarget })
  @IsEnum(AnnouncementTarget)
  @IsOptional()
  targetAudience?: AnnouncementTarget;

  @ApiPropertyOptional({ enum: AnnouncementPriority })
  @IsEnum(AnnouncementPriority)
  @IsOptional()
  priority?: AnnouncementPriority;
}
