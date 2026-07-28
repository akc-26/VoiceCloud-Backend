import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDeviceDto {
  @ApiProperty({ description: 'Unique device identifier', example: 'dev_iphone_14_pro_001' })
  @IsString()
  @IsNotEmpty()
  deviceId: string;

  @ApiPropertyOptional({ description: 'Platform or device type (e.g. android, ios, web, mobile)', example: 'android' })
  @IsOptional()
  @IsString()
  platform?: string;

  @ApiPropertyOptional({ description: 'Device type (e.g. mobile, tablet, desktop)', example: 'mobile' })
  @IsOptional()
  @IsString()
  deviceType?: string;

  @ApiPropertyOptional({ description: 'Device name or model', example: 'iPhone 14 Pro' })
  @IsOptional()
  @IsString()
  deviceName?: string;

  @ApiPropertyOptional({ description: 'Operating system version', example: 'iOS 17.4' })
  @IsOptional()
  @IsString()
  osVersion?: string;

  @ApiPropertyOptional({ description: 'Application build/version', example: '1.2.0' })
  @IsOptional()
  @IsString()
  appVersion?: string;

  @ApiPropertyOptional({ description: 'FCM push registration token', example: 'fcm_push_token_xyz_123' })
  @IsOptional()
  @IsString()
  pushToken?: string;
}
