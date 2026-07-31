import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { SubscriptionCycle } from '../entities/vip-membership.entity';

export class UpgradeDowngradeVipDto {
  @ApiProperty({ example: 'vip-tier-5-id', description: 'Target Tier ID' })
  @IsString()
  newTierId: string;

  @ApiPropertyOptional({
    enum: SubscriptionCycle,
    example: SubscriptionCycle.MONTHLY,
  })
  @IsOptional()
  @IsEnum(SubscriptionCycle)
  cycle?: SubscriptionCycle;
}
