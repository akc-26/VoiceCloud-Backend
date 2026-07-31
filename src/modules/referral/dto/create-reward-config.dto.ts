import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { RewardType, RewardTrigger } from '../enums/referral.enums';

export class CreateRewardConfigDto {
  @ApiProperty({ enum: RewardType, description: 'Type of reward' })
  @IsEnum(RewardType)
  rewardType: RewardType;

  @ApiProperty({
    description: 'Reward amount (coins, diamonds, XP, VIP days)',
    example: 100,
  })
  @IsInt()
  @Min(1)
  amount: number;

  @ApiPropertyOptional({
    description: 'Item ID (for store items, frames, bubbles, effects)',
  })
  @IsOptional()
  @IsString()
  itemId?: string;

  @ApiProperty({ enum: RewardTrigger, description: 'Trigger event for reward' })
  @IsEnum(RewardTrigger)
  triggerEvent: RewardTrigger;

  @ApiPropertyOptional({
    description: 'Reward recipient target: REFERRER, REFERRED, or BOTH',
    example: 'REFERRER',
  })
  @IsOptional()
  @IsString()
  target?: string;
}
