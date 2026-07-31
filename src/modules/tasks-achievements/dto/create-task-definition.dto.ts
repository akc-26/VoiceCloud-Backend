import {
  IsString,
  IsEnum,
  IsInt,
  IsBoolean,
  IsOptional,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskPeriod } from '../entities/task-definition.entity';

export class CreateTaskDefinitionDto {
  @ApiProperty({
    description: 'Task title',
    example: 'Daily Voice Room Listener',
  })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Task description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Icon identifier',
    example: 'headphones_icon',
  })
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiProperty({ enum: TaskPeriod, default: TaskPeriod.DAILY })
  @IsEnum(TaskPeriod)
  resetPeriod: TaskPeriod;

  @ApiProperty({
    description: 'Event key to trigger progress',
    example: 'listen_room',
  })
  @IsString()
  eventKey: string;

  @ApiProperty({ description: 'Target count to complete task', example: 5 })
  @IsInt()
  @Min(1)
  targetCount: number;

  @ApiPropertyOptional({ description: 'Reward Coins', example: 100 })
  @IsInt()
  @Min(0)
  @IsOptional()
  rewardCoins?: number;

  @ApiPropertyOptional({ description: 'Reward Diamonds', example: 5 })
  @IsInt()
  @Min(0)
  @IsOptional()
  rewardDiamonds?: number;

  @ApiPropertyOptional({ description: 'Reward XP', example: 50 })
  @IsInt()
  @Min(0)
  @IsOptional()
  rewardXp?: number;

  @ApiPropertyOptional({ description: 'Reward VIP Days', example: 1 })
  @IsInt()
  @Min(0)
  @IsOptional()
  rewardVipDays?: number;

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

  @ApiPropertyOptional({ description: 'Reward Badge ID/Name' })
  @IsString()
  @IsOptional()
  rewardBadge?: string;

  @ApiPropertyOptional({ description: 'Whether task is active', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Display order', default: 0 })
  @IsInt()
  @IsOptional()
  displayOrder?: number;
}
