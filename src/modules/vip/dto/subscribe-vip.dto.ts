import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional, IsEnum } from 'class-validator';
import { SubscriptionCycle } from '../entities/vip-membership.entity';
import { PaymentProviderType } from '../../../common/enums';

export class SubscribeVipDto {
  @ApiProperty({ example: 'vip-tier-1-id', description: 'Tier ID or Plan ID' })
  @IsString()
  tierId: string;

  @ApiPropertyOptional({
    example: 'vip-tier-1-id',
    description: 'Alias for tierId',
  })
  @IsOptional()
  @IsString()
  planId?: string;

  @ApiPropertyOptional({
    enum: SubscriptionCycle,
    default: SubscriptionCycle.MONTHLY,
    example: SubscriptionCycle.MONTHLY,
  })
  @IsOptional()
  @IsEnum(SubscriptionCycle)
  cycle?: SubscriptionCycle;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean;

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

export { SubscribeVipDto as PurchaseVipDto };
