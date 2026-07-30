import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsNumber,
  IsEnum,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { RefundType } from '../../../common/enums';

export class ProcessRefundDto {
  @ApiPropertyOptional({ description: 'Purchase ID being refunded' })
  @IsOptional()
  @IsUUID()
  purchaseId?: string;

  @ApiPropertyOptional({ description: 'Transaction ID being refunded' })
  @IsOptional()
  @IsUUID()
  transactionId?: string;

  @ApiProperty({ description: 'User ID owner of transaction' })
  @IsUUID()
  userId: string;

  @ApiProperty({ description: 'Refund amount in fiat currency' })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({ enum: RefundType, default: RefundType.FULL })
  @IsOptional()
  @IsEnum(RefundType)
  refundType?: RefundType = RefundType.FULL;

  @ApiPropertyOptional({ description: 'Reason for refund' })
  @IsOptional()
  @IsString()
  reason?: string;
}
