import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { VipRewardType } from '../entities/vip-reward.entity';

export class CreateVipRewardDto {
  @ApiProperty({ example: 'VIP Daily Check-in Bonus' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ example: 'Receive 50 coins and 100 VIP EXP' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: VipRewardType, example: VipRewardType.DAILY })
  @IsEnum(VipRewardType)
  rewardType: VipRewardType;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @Min(1)
  @Max(10)
  minVipLevel: number;

  @ApiPropertyOptional({ example: 50 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  coins?: number;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  exp?: number;

  @ApiPropertyOptional({ example: 'gift' })
  @IsOptional()
  @IsString()
  itemType?: string;

  @ApiPropertyOptional({ example: 'item-uuid-123' })
  @IsOptional()
  @IsString()
  itemId?: string;

  @ApiPropertyOptional({ example: 7 })
  @IsOptional()
  @IsNumber()
  itemDurationDays?: number;

  @ApiPropertyOptional({
    example: 'https://cdn.voicecloud.app/rewards/chest.png',
  })
  @IsOptional()
  @IsString()
  iconUrl?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
