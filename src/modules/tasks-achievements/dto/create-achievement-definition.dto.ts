import {
  IsString,
  IsEnum,
  IsInt,
  IsBoolean,
  IsOptional,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AchievementRarity } from '../entities/achievement-definition.entity';

export class CreateAchievementDefinitionDto {
  @ApiProperty({
    description: 'Achievement title',
    example: 'Social Butterfly',
  })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Achievement description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: AchievementRarity, default: AchievementRarity.COMMON })
  @IsEnum(AchievementRarity)
  rarity: AchievementRarity;

  @ApiPropertyOptional({
    description: 'Badge identifier',
    example: 'social_badge',
  })
  @IsString()
  @IsOptional()
  badge?: string;

  @ApiPropertyOptional({
    description: 'Icon identifier',
    example: 'butterfly_icon',
  })
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiPropertyOptional({
    description: 'Frame identifier',
    example: 'gold_frame',
  })
  @IsString()
  @IsOptional()
  frame?: string;

  @ApiProperty({ description: 'Event key to track', example: 'follow_users' })
  @IsString()
  eventKey: string;

  @ApiProperty({ description: 'Target count for unlock', example: 50 })
  @IsInt()
  @Min(1)
  targetCount: number;

  @ApiPropertyOptional({ description: 'XP Bonus', example: 200 })
  @IsInt()
  @Min(0)
  @IsOptional()
  xpBonus?: number;

  @ApiPropertyOptional({ description: 'Coin Reward', example: 500 })
  @IsInt()
  @Min(0)
  @IsOptional()
  coinReward?: number;

  @ApiPropertyOptional({ description: 'Diamond Reward', example: 20 })
  @IsInt()
  @Min(0)
  @IsOptional()
  diamondReward?: number;

  @ApiPropertyOptional({ description: 'Reward Profile Frame ID/Name' })
  @IsString()
  @IsOptional()
  rewardProfileFrame?: string;

  @ApiPropertyOptional({ description: 'Reward Chat Bubble ID/Name' })
  @IsString()
  @IsOptional()
  rewardChatBubble?: string;

  @ApiPropertyOptional({ description: 'Reward Entrance Effect ID/Name' })
  @IsString()
  @IsOptional()
  rewardEntranceEffect?: string;

  @ApiPropertyOptional({ description: 'Reward Sticker ID/Name' })
  @IsString()
  @IsOptional()
  rewardSticker?: string;

  @ApiPropertyOptional({
    description: 'Whether achievement is active',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Display order', default: 0 })
  @IsInt()
  @IsOptional()
  displayOrder?: number;
}
