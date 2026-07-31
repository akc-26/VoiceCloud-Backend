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
  IsBoolean,
  IsOptional,
  IsEnum,
  IsObject,
} from 'class-validator';
import { PaymentProviderType } from '../../../common/enums';

@Entity('payment_providers')
export class PaymentProvider {
  @ApiProperty({ description: 'Unique payment provider ID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Provider name' })
  @Column({ type: 'varchar' })
  @IsString()
  name: string;

  @ApiProperty({ enum: PaymentProviderType })
  @Column({ type: 'varchar', unique: true })
  @Index('IDX_payment_providers_code', { unique: true })
  @IsEnum(PaymentProviderType)
  code: PaymentProviderType;

  @ApiProperty({ description: 'Is provider active' })
  @Column({ type: 'boolean', default: true })
  @IsBoolean()
  isEnabled: boolean;

  @ApiProperty({ description: 'Is mock implementation' })
  @Column({ type: 'boolean', default: true })
  @IsBoolean()
  isMock: boolean;

  @ApiPropertyOptional({ description: 'Supported currencies' })
  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  supportedCurrencies: string[];

  @ApiPropertyOptional({ description: 'Supported countries' })
  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  supportedCountries: string[];

  @ApiPropertyOptional({ description: 'Provider configuration metadata' })
  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  @IsObject()
  config: Record<string, unknown>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
