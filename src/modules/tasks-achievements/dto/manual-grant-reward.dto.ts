import { IsString, IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RewardType } from '../entities/reward-audit-log.entity';

export class ManualGrantRewardDto {
  @ApiProperty({ description: 'Target user ID' })
  @IsString()
  userId: string;

  @ApiProperty({ enum: RewardType, example: RewardType.COINS })
  @IsEnum(RewardType)
  rewardType: RewardType;

  @ApiProperty({ description: 'Reward amount / duration', example: 500 })
  @IsInt()
  @Min(1)
  amount: number;

  @ApiPropertyOptional({ description: 'Optional metadata / item ID' })
  @IsString()
  @IsOptional()
  metadata?: string;

  @ApiPropertyOptional({ description: 'Optional retry idempotency key' })
  @IsString()
  @IsOptional()
  operationKey?: string;

  @ApiPropertyOptional({
    description: 'Reason or source note',
    example: 'Admin promotion',
  })
  @IsString()
  @IsOptional()
  reason?: string;
}
