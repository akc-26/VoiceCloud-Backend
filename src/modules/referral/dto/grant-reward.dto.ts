import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { RewardType } from '../enums/referral.enums';

export class GrantRewardDto {
  @ApiProperty({ description: 'Target User ID' })
  @IsNotEmpty()
  @IsString()
  userId: string;

  @ApiProperty({ enum: RewardType, description: 'Type of reward' })
  @IsEnum(RewardType)
  rewardType: RewardType;

  @ApiProperty({ description: 'Amount or quantity', example: 500 })
  @IsInt()
  @Min(1)
  amount: number;

  @ApiPropertyOptional({
    description: 'Item ID if store item / frame / bubble',
  })
  @IsOptional()
  @IsString()
  itemId?: string;

  @ApiPropertyOptional({
    description: 'Reason for manual grant',
    example: 'Manual Admin Grant',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
