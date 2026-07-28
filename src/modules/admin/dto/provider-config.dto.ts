import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsObject,
  IsNumber,
  IsArray,
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

  @ApiProperty({ description: 'Display name for provider profile' })
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

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isSandbox?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  priority?: number;

  @ApiPropertyOptional({ description: 'Admin notes for this configuration' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Tags e.g. production, raspberry-pi, s3-compatible' })
  @IsOptional()
  @IsArray()
  tags?: string[];
}

export class UpdateProviderConfigDto {
  @ApiPropertyOptional({ description: 'Display name for provider profile' })
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

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isSandbox?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  priority?: number;

  @ApiPropertyOptional({ description: 'Admin notes for this configuration' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Tags' })
  @IsOptional()
  @IsArray()
  tags?: string[];
}

export class RotateSecretDto {
  @ApiProperty({ description: 'Secret parameters to update or rotate' })
  @IsObject()
  secretConfig: Record<string, any>;

  @ApiPropertyOptional({ description: 'Reason for secret rotation' })
  @IsOptional()
  @IsString()
  reason?: string;
}
