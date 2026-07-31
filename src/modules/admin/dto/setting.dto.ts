import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsObject,
} from 'class-validator';
import { SettingValueType } from '../entities/system-setting.entity';

export class UpdateSettingDto {
  @ApiProperty({ description: 'Value of the setting as string or JSON string' })
  @IsString()
  @IsNotEmpty()
  value: string;
}

export class CreateSettingDto {
  @ApiProperty({ description: 'Unique key for setting' })
  @IsString()
  @IsNotEmpty()
  key: string;

  @ApiProperty({ description: 'Setting group' })
  @IsString()
  @IsNotEmpty()
  group: string;

  @ApiProperty({ description: 'Setting title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: 'Setting description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Value of the setting' })
  @IsString()
  @IsNotEmpty()
  value: string;

  @ApiPropertyOptional({
    enum: SettingValueType,
    default: SettingValueType.STRING,
  })
  @IsOptional()
  @IsEnum(SettingValueType)
  valueType?: SettingValueType;

  @ApiPropertyOptional({ description: 'Default value' })
  @IsOptional()
  @IsString()
  defaultValue?: string;

  @ApiPropertyOptional({ description: 'Validation rules object' })
  @IsOptional()
  @IsObject()
  validationRules?: Record<string, any>;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isEditable?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
