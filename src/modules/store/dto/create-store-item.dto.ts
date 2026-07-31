import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsArray,
  Min,
} from 'class-validator';
import {
  StoreCategory,
  ItemRarity,
  DurationPriceOption,
} from '../entities/store-item.entity';

export class CreateStoreItemDto {
  @ApiProperty({ example: 'Golden Phoenix Avatar Frame' })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    example: 'Exclusive glowing phoenix frame for profile avatar',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: StoreCategory, example: StoreCategory.AVATAR_FRAME })
  @IsEnum(StoreCategory)
  category: StoreCategory;

  @ApiPropertyOptional({ enum: ItemRarity, example: ItemRarity.LEGENDARY })
  @IsOptional()
  @IsEnum(ItemRarity)
  rarity?: ItemRarity;

  @ApiProperty({
    example: 'https://cdn.voicecloud.app/store/icons/phoenix_frame.png',
  })
  @IsString()
  iconUrl: string;

  @ApiPropertyOptional({
    example: 'https://cdn.voicecloud.app/store/preview/phoenix_frame.mp4',
  })
  @IsOptional()
  @IsString()
  previewUrl?: string;

  @ApiProperty({
    example: 'https://cdn.voicecloud.app/store/svga/phoenix_frame.svga',
  })
  @IsString()
  assetUrl: string;

  @ApiProperty({ example: 500 })
  @IsNumber()
  @Min(0)
  priceCoins: number;

  @ApiPropertyOptional({ example: 50 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  priceDiamonds?: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isVipExclusive?: boolean;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minVipLevel?: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isLimitedEdition?: boolean;

  @ApiPropertyOptional({ example: 1000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  stockQuantity?: number;

  @ApiPropertyOptional({
    example: [
      { days: 7, coinPrice: 200 },
      { days: 30, coinPrice: 500 },
      { days: -1, coinPrice: 2000 },
    ],
  })
  @IsOptional()
  @IsArray()
  durations?: DurationPriceOption[];

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
