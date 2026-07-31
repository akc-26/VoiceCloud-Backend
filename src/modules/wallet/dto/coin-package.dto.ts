import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsInt,
  IsEnum,
  Min,
} from 'class-validator';
import { WalletCurrency } from '../../../common/enums';

export class CreateCoinPackageDto {
  @ApiProperty({ description: 'Package name' })
  @IsString()
  packageName: string;

  @ApiProperty({ description: 'Base coins amount' })
  @IsInt()
  @Min(1)
  coinAmount: number;

  @ApiPropertyOptional({ description: 'Bonus coins amount', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  bonusCoins?: number = 0;

  @ApiProperty({ description: 'Package price' })
  @IsNumber()
  @Min(0.01)
  price: number;

  @ApiPropertyOptional({ enum: WalletCurrency, default: WalletCurrency.USD })
  @IsOptional()
  @IsEnum(WalletCurrency)
  currency?: WalletCurrency = WalletCurrency.USD;

  @ApiPropertyOptional({ description: 'Badge text (e.g. BEST VALUE, HOT)' })
  @IsOptional()
  @IsString()
  badgeText?: string;

  @ApiPropertyOptional({ description: 'Display sorting order', default: 0 })
  @IsOptional()
  @IsInt()
  displayOrder?: number = 0;

  @ApiPropertyOptional({ description: 'Is popular tag flag', default: false })
  @IsOptional()
  @IsBoolean()
  isPopular?: boolean = false;

  @ApiPropertyOptional({
    description: 'Is package active for purchase',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

  @ApiPropertyOptional({
    description: 'Country or region code for country-specific pricing',
  })
  @IsOptional()
  @IsString()
  country?: string;
}

export class UpdateCoinPackageDto extends CreateCoinPackageDto {}
