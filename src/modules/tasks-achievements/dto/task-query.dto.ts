import { IsOptional, IsString, IsEnum, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TaskPeriod } from '../entities/task-definition.entity';

export class TaskQueryDto {
  @ApiPropertyOptional({
    enum: TaskPeriod,
    description: 'Filter tasks by reset period',
  })
  @IsEnum(TaskPeriod)
  @IsOptional()
  period?: TaskPeriod;

  @ApiPropertyOptional({ description: 'Filter tasks by search term' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter tasks by event key' })
  @IsString()
  @IsOptional()
  eventKey?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Limit per page', default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 20;
}
