import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsArray,
} from 'class-validator';

export enum StoreCategory {
  AVATAR_FRAME = 'AVATAR_FRAME',
  CHAT_BUBBLE = 'CHAT_BUBBLE',
  ENTRANCE_EFFECT = 'ENTRANCE_EFFECT',
  ROOM_THEME = 'ROOM_THEME',
  VEHICLE_MOUNT = 'VEHICLE_MOUNT',
  NOBILITY_BADGE = 'NOBILITY_BADGE',
  PROFILE_CARD_BG = 'PROFILE_CARD_BG',
}

export enum ItemRarity {
  COMMON = 'COMMON',
  RARE = 'RARE',
  EPIC = 'EPIC',
  LEGENDARY = 'LEGENDARY',
}

export interface DurationPriceOption {
  days: number; // e.g. 7, 30, -1 for permanent
  coinPrice: number;
  diamondPrice?: number;
}

@Entity('store_items')
export class StoreItem {
  @ApiProperty({ description: 'Unique store item ID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Item title name' })
  @Column({ type: 'varchar' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Item description' })
  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    enum: StoreCategory,
    description: 'Item decor category',
  })
  @Index()
  @Column({ type: 'varchar' })
  @IsEnum(StoreCategory)
  category: StoreCategory;

  @ApiProperty({
    enum: ItemRarity,
    default: ItemRarity.COMMON,
  })
  @Column({ type: 'varchar', default: ItemRarity.COMMON })
  @IsEnum(ItemRarity)
  rarity: ItemRarity;

  @ApiProperty({ description: 'Icon thumbnail URL' })
  @Column({ type: 'varchar' })
  @IsString()
  iconUrl: string;

  @ApiPropertyOptional({ description: 'Preview animation / video URL' })
  @Column({ type: 'varchar', nullable: true })
  @IsOptional()
  @IsString()
  previewUrl?: string;

  @ApiProperty({ description: 'Raw asset URL (SVGA / Lottie / Image)' })
  @Column({ type: 'varchar' })
  @IsString()
  assetUrl: string;

  @ApiProperty({
    description: 'Default coin price (for 30 days or default option)',
  })
  @Column({ type: 'int', default: 0 })
  @IsNumber()
  priceCoins: number;

  @ApiProperty({ description: 'Default diamond price' })
  @Column({ type: 'int', default: 0 })
  @IsNumber()
  priceDiamonds: number;

  @ApiProperty({ description: 'Whether item is exclusive to VIP members' })
  @Column({ type: 'boolean', default: false })
  @IsBoolean()
  isVipExclusive: boolean;

  @ApiProperty({ description: 'Minimum VIP level required to purchase' })
  @Column({ type: 'int', default: 0 })
  @IsNumber()
  minVipLevel: number;

  @ApiProperty({ description: 'Whether item is limited stock' })
  @Column({ type: 'boolean', default: false })
  @IsBoolean()
  isLimitedEdition: boolean;

  @ApiProperty({ description: 'Available stock count if limited edition' })
  @Column({ type: 'int', default: 999999 })
  @IsNumber()
  stockQuantity: number;

  @ApiProperty({
    description:
      'Purchase duration options array (e.g. 7 days, 30 days, permanent -1)',
  })
  @Column({ type: 'json', nullable: true })
  @IsOptional()
  @IsArray()
  durations: DurationPriceOption[];

  @ApiProperty({ description: 'Item active status flag' })
  @Column({ type: 'boolean', default: true })
  @IsBoolean()
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
