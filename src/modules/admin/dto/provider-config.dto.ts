import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsObject,
  IsNumber,
} from 'class-validator';
import { ProviderCategory } from '../entities/provider-config.entity';

export class CreateProviderConfigDto {
  @ApiProperty({ enum: ProviderCategory })
  @IsEnum(ProviderCategory)
  category: ProviderCategory;

  @ApiProperty({
    description: 'Provider identifier type e.g. agora, stripe, s3',
  })
  @IsString()
  @IsNotEmpty()
  providerType: string;

  @ApiProperty({ description: 'Display name for provider' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Provider credentials and configuration JSON' })
  @IsObject()
  config: Record<string, any>;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isSandbox?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  priority?: number;
}

export class UpdateProviderConfigDto {
  @ApiPropertyOptional({ description: 'Display name for provider' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Provider configuration JSON' })
  @IsOptional()
  @IsObject()
  config?: Record<string, any>;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isSandbox?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  priority?: number;
}
