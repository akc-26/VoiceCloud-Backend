import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDeviceDto {
  @ApiProperty({ example: 'dev_iphone_14_pro_001' })
  @IsString()
  deviceId: string;

  @ApiProperty({ example: 'mobile' })
  @IsString()
  deviceType: string;

  @ApiProperty({ example: 'iPhone 14 Pro' })
  @IsString()
  deviceName: string;

  @ApiPropertyOptional({ example: 'iOS 17.4' })
  @IsOptional()
  @IsString()
  osVersion?: string;

  @ApiPropertyOptional({ example: '1.2.0' })
  @IsOptional()
  @IsString()
  appVersion?: string;

  @ApiPropertyOptional({ example: 'fcm_push_token_xyz_123' })
  @IsOptional()
  @IsString()
  pushToken?: string;
}
