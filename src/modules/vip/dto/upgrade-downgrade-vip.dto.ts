import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { SubscriptionCycle } from '../entities/vip-membership.entity';
import { PaymentProviderType } from '../../../common/enums';

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

  @ApiPropertyOptional({ enum: PaymentProviderType })
  @IsOptional()
  @IsEnum(PaymentProviderType)
  provider?: PaymentProviderType;

  @ApiPropertyOptional({ description: 'Payment provider receipt/token' })
  @IsOptional()
  @IsString()
  receipt?: string;

  @ApiPropertyOptional({ description: 'Optional provider signature' })
  @IsOptional()
  @IsString()
  signature?: string;

  @ApiPropertyOptional({ description: 'Optional retry idempotency key' })
  @IsOptional()
  @IsString()
  operationKey?: string;
}
