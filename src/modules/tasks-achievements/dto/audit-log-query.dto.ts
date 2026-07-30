import { IsOptional, IsString, IsEnum, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { RewardType } from '../entities/reward-audit-log.entity';

export class AuditLogQueryDto {
  @ApiPropertyOptional({ description: 'Filter by User ID' })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({
    enum: RewardType,
    description: 'Filter by Reward Type',
  })
  @IsEnum(RewardType)
  @IsOptional()
  rewardType?: RewardType;

  @ApiPropertyOptional({ description: 'Filter by Source' })
  @IsString()
  @IsOptional()
  source?: string;

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
