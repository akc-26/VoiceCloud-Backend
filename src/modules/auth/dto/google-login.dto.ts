import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class GoogleLoginDto {
  @ApiProperty({
    description: 'Google Sign In ID Token received from Android/Web client',
    example: 'eyJhbGci...',
  })
  @IsString()
  @IsNotEmpty()
  idToken: string;

  @ApiPropertyOptional({
    description: 'Referral code if invited',
    example: 'VC882910',
  })
  @IsOptional()
  @IsString()
  referralCode?: string;

  @ApiPropertyOptional({
    description: 'Device ID',
    example: 'dev_galaxy_s23_001',
  })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiPropertyOptional({
    description: 'Device display name',
    example: 'Samsung Galaxy S23',
  })
  @IsOptional()
  @IsString()
  deviceName?: string;

  @ApiPropertyOptional({
    description: 'Device type (mobile, tablet, web)',
    example: 'mobile',
  })
  @IsOptional()
  @IsString()
  deviceType?: string;

  @ApiPropertyOptional({ description: 'OS version', example: 'Android 14' })
  @IsOptional()
  @IsString()
  osVersion?: string;

  @ApiPropertyOptional({ description: 'App version', example: '1.5.0' })
  @IsOptional()
  @IsString()
  appVersion?: string;
}
