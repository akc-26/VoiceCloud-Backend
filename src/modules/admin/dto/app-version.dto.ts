import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsEnum,
} from 'class-validator';
import { AppPlatform } from '../entities/app-version.entity';

export class CreateAppVersionDto {
  @ApiProperty({ enum: AppPlatform })
  @IsEnum(AppPlatform)
  platform: AppPlatform;

  @ApiProperty({ description: 'Latest version string (e.g. 1.2.0)' })
  @IsString()
  @IsNotEmpty()
  latestVersion: string;

  @ApiProperty({ description: 'Minimum supported version string (e.g. 1.0.0)' })
  @IsString()
  @IsNotEmpty()
  minSupportedVersion: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  forceUpdate?: boolean;

  @ApiPropertyOptional({ description: 'Release notes' })
  @IsOptional()
  @IsString()
  releaseNotes?: string;

  @ApiPropertyOptional({ description: 'Download or Store URL' })
  @IsOptional()
  @IsString()
  downloadUrl?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDeprecated?: boolean;
}

export class UpdateAppVersionDto {
  @ApiPropertyOptional({ description: 'Latest version string' })
  @IsOptional()
  @IsString()
  latestVersion?: string;

  @ApiPropertyOptional({ description: 'Minimum supported version string' })
  @IsOptional()
  @IsString()
  minSupportedVersion?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  forceUpdate?: boolean;

  @ApiPropertyOptional({ description: 'Release notes' })
  @IsOptional()
  @IsString()
  releaseNotes?: string;

  @ApiPropertyOptional({ description: 'Download or Store URL' })
  @IsOptional()
  @IsString()
  downloadUrl?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDeprecated?: boolean;
}
