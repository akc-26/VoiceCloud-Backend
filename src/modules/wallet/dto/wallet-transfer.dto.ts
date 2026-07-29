import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsNumber,
  IsEnum,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { WalletBalanceType } from '../../../common/enums';

export class WalletTransferDto {
  @ApiProperty({ description: 'Recipient user ID' })
  @IsUUID()
  recipientUserId: string;

  @ApiProperty({ description: 'Amount to transfer' })
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

  @ApiPropertyOptional({ description: 'Transfer remarks or note' })
  @IsOptional()
  @IsString()
  remarks?: string;
}
