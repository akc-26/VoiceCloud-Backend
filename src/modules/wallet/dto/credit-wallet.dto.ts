import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsNumber,
  IsEnum,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import {
  WalletBalanceType,
  WalletTransactionType,
} from '../../../common/enums';

export class CreditWalletDto {
  @ApiProperty({ description: 'User ID to credit' })
  @IsUUID()
  userId: string;

  @ApiProperty({ description: 'Amount to credit' })
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
    default: WalletTransactionType.CREDIT,
  })
  @IsOptional()
  @IsEnum(WalletTransactionType)
  transactionType?: WalletTransactionType = WalletTransactionType.CREDIT;

  @ApiPropertyOptional({ description: 'Remarks or reason for credit' })
  @IsOptional()
  @IsString()
  remarks?: string;

  @ApiPropertyOptional({
    description: 'Reference ID (e.g. order ID, ticket ID)',
  })
  @IsOptional()
  @IsString()
  referenceId?: string;

  @ApiPropertyOptional({
    description: 'Reference Type (e.g. ADMIN_CREDIT, GIFT)',
  })
  @IsOptional()
  @IsString()
  referenceType?: string;
}
