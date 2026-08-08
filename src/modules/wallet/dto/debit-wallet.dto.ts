import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import {
  WalletBalanceType,
  WalletTransactionType,
} from '../../../common/enums';

export class DebitWalletDto {
  @ApiProperty({ description: 'User ID to debit' })
  @IsUUID()
  userId: string;

  @ApiProperty({ description: 'Amount to debit' })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({
    enum: WalletBalanceType,
    default: WalletBalanceType.COIN,
  })
  @IsOptional()
  @IsEnum(WalletBalanceType)
  balanceType?: WalletBalanceType = WalletBalanceType.COIN;

  @ApiPropertyOptional({
    enum: WalletTransactionType,
    default: WalletTransactionType.DEBIT,
  })
  @IsOptional()
  @IsEnum(WalletTransactionType)
  transactionType?: WalletTransactionType = WalletTransactionType.DEBIT;

  @ApiPropertyOptional({ description: 'Remarks or reason for debit' })
  @IsOptional()
  @IsString()
  remarks?: string;

  @ApiPropertyOptional({ description: 'Reference ID' })
  @IsOptional()
  @IsString()
  referenceId?: string;

  @ApiPropertyOptional({ description: 'Reference Type' })
  @IsOptional()
  @IsString()
  referenceType?: string;

  @ApiPropertyOptional({
    description:
      'Optional idempotency key for safely retrying this financial operation',
  })
  @IsOptional()
  @IsString()
  operationKey?: string;
}
