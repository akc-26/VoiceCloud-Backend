import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, Matches } from 'class-validator';

export class SendOtpDto {
  @ApiProperty({ description: 'Phone number in E.164 format (e.g. +1234567890)', example: '+1234567890' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+[1-9]\d{1,14}$/, { message: 'Phone number must be in E.164 format (e.g. +1234567890)' })
  phoneNumber: string;
}

export class VerifyOtpDto {
  @ApiProperty({ description: 'Phone number in E.164 format', example: '+1234567890' })
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @ApiProperty({ description: '6-digit OTP code', example: '123456' })
  @IsString()
  @IsNotEmpty()
  otpCode: string;
}

export class PhoneLoginDto {
  @ApiProperty({ description: 'Phone number in E.164 format', example: '+1234567890' })
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @ApiPropertyOptional({ description: '6-digit OTP code', example: '123456' })
  @IsOptional()
  @IsString()
  otpCode?: string;

  @ApiPropertyOptional({ description: 'Firebase Auth ID token (alternative to OTP code)', example: 'eyJhbGci...' })
  @IsOptional()
  @IsString()
  firebaseIdToken?: string;

  @ApiPropertyOptional({ description: 'Referral code if invited by another user', example: 'VC882910' })
  @IsOptional()
  @IsString()
  referralCode?: string;

  @ApiPropertyOptional({ description: 'Unique device fingerprint/ID', example: 'dev_pixel7_001' })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiPropertyOptional({ description: 'Device display name', example: 'Google Pixel 7' })
  @IsOptional()
  @IsString()
  deviceName?: string;

  @ApiPropertyOptional({ description: 'Device type (mobile, tablet, web)', example: 'mobile' })
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

  @ApiPropertyOptional({ description: 'Device manufacturer', example: 'Google' })
  @IsOptional()
  @IsString()
  manufacturer?: string;

  @ApiPropertyOptional({ description: 'Device model', example: 'Pixel 7 Pro' })
  @IsOptional()
  @IsString()
  model?: string;
}
