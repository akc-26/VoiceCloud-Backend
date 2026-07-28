import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AppPlatform } from '../../admin/entities/app-version.entity';

export class VersionCheckDto {
  @ApiPropertyOptional({ enum: AppPlatform, example: AppPlatform.ANDROID })
  @IsOptional()
  @IsEnum(AppPlatform)
  platform?: AppPlatform = AppPlatform.ANDROID;

  @ApiPropertyOptional({ description: 'Client application version', example: '1.0.0' })
  @IsOptional()
  @IsString()
  currentVersion?: string;
}
