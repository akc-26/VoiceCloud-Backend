import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsEnum, IsOptional, IsString } from 'class-validator';
import { PaymentProviderType } from '../../../common/enums';

export class PurchaseCoinsDto {
  @ApiProperty({ description: 'Coin Package ID' })
  @IsUUID()
  packageId: string;

  @ApiProperty({
    enum: PaymentProviderType,
    default: PaymentProviderType.GOOGLE_PLAY,
  })
  @IsEnum(PaymentProviderType)
  provider: PaymentProviderType;

  @ApiPropertyOptional({ description: 'Idempotency key for replay protection' })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
