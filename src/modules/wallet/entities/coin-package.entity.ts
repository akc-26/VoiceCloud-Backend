import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsBoolean, IsOptional, IsInt, IsEnum } from 'class-validator';
import { WalletCurrency } from '../../../common/enums';

const decimalTransformer = {
  to: (value: number) => value,
  from: (value: string | number) => (value === null || value === undefined ? 0 : Number(value)),
};

const bigintTransformer = {
  to: (value: number) => value,
  from: (value: string | number) => (value === null || value === undefined ? 0 : Number(value)),
};

@Entity('coin_packages')
export class CoinPackage {
  @ApiProperty({ description: 'Unique coin package ID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Name of the coin package' })
  @Column({ type: 'varchar' })
  @IsString()
  packageName: string;

  @ApiProperty({ description: 'Base coins amount' })
  @Column({ type: 'bigint', default: 0, transformer: bigintTransformer })
  @IsInt()
  coinAmount: number;

  @ApiProperty({ description: 'Bonus coins amount' })
  @Column({ type: 'bigint', default: 0, transformer: bigintTransformer })
  @IsInt()
  bonusCoins: number;

  @ApiProperty({ description: 'Package price' })
  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0, transformer: decimalTransformer })
  @IsNumber()
  price: number;

  @ApiProperty({ enum: WalletCurrency, default: WalletCurrency.USD })
  @Column({ type: 'varchar', default: WalletCurrency.USD })
  @IsEnum(WalletCurrency)
  currency: WalletCurrency;

  @ApiPropertyOptional({ description: 'Badge text (e.g., BEST VALUE, HOT)' })
  @Column({ type: 'varchar', nullable: true })
  @IsOptional()
  @IsString()
  badgeText: string;

  @ApiProperty({ description: 'Display sorting order' })
  @Index('IDX_coin_packages_displayOrder')
  @Column({ type: 'int', default: 0 })
  @IsInt()
  displayOrder: number;

  @ApiProperty({ description: 'Is popular tag flag' })
  @Column({ type: 'boolean', default: false })
  @IsBoolean()
  isPopular: boolean;

  @ApiProperty({ description: 'Is package active for purchase' })
  @Index('IDX_coin_packages_isActive')
  @Column({ type: 'boolean', default: true })
  @IsBoolean()
  isActive: boolean;

  @ApiPropertyOptional({ description: 'Promotion start time' })
  @Column({ type: 'timestamp', nullable: true })
  @IsOptional()
  startsAt: Date;

  @ApiPropertyOptional({ description: 'Promotion expiration time' })
  @Column({ type: 'timestamp', nullable: true })
  @IsOptional()
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
