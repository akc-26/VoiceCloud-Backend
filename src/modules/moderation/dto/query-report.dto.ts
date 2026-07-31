import { IsOptional, IsEnum, IsInt, Min, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ReportTargetType,
  ReportReason,
  ReportStatus,
} from '../entities/report.entity';

export class QueryReportDto {
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

  @ApiPropertyOptional({ enum: ReportStatus })
  @IsEnum(ReportStatus)
  @IsOptional()
  status?: ReportStatus;

  @ApiPropertyOptional({ enum: ReportTargetType })
  @IsEnum(ReportTargetType)
  @IsOptional()
  targetType?: ReportTargetType;

  @ApiPropertyOptional({ enum: ReportReason })
  @IsEnum(ReportReason)
  @IsOptional()
  reason?: ReportReason;

  @ApiPropertyOptional({
    example: 'harassment',
    description: 'Search term for targetId or description',
  })
  @IsString()
  @IsOptional()
  search?: string;
}
