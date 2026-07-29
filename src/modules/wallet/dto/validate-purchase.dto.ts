import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsEnum, IsString, IsOptional } from 'class-validator';
import { PaymentProviderType } from '../../../common/enums';

export class ValidatePurchaseDto {
  @ApiPropertyOptional({
    description: 'Purchase session ID if previously initiated',
  })
  @IsOptional()
  @IsUUID()
  purchaseId?: string;

  @ApiProperty({ description: 'Coin package ID' })
  @IsUUID()
  packageId: string;

  @ApiProperty({
    enum: PaymentProviderType,
    default: PaymentProviderType.GOOGLE_PLAY,
  })
  @IsEnum(PaymentProviderType)
  provider: PaymentProviderType;

  @ApiProperty({ description: 'Raw receipt token or payment payload' })
  @IsString()
  receipt: string;

  @ApiPropertyOptional({ description: 'Digital signature for verification' })
  @IsOptional()
  @IsString()
  signature?: string;

  @ApiPropertyOptional({ description: 'Idempotency key for replay protection' })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
