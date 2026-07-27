import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEmail } from 'class-validator';

export class GuestLoginDto {
  @ApiPropertyOptional({ description: 'Referral code if invited', example: 'VC882910' })
  @IsOptional()
  @IsString()
  referralCode?: string;

  @ApiPropertyOptional({ description: 'Device ID', example: 'dev_guest_device_123' })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiPropertyOptional({ description: 'Device display name', example: 'Android Device' })
  @IsOptional()
  @IsString()
  deviceName?: string;

  @ApiPropertyOptional({ description: 'Device type', example: 'mobile' })
  @IsOptional()
  @IsString()
  deviceType?: string;
}

export class GuestUpgradeDto {
  @ApiPropertyOptional({ description: 'Target link method: phone, google, or email', example: 'phone' })
  @IsOptional()
  @IsString()
  method?: 'phone' | 'google' | 'email';

  @ApiPropertyOptional({ description: 'Phone number in E.164 format', example: '+1234567890' })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiPropertyOptional({ description: '6-digit OTP code', example: '123456' })
  @IsOptional()
  @IsString()
  otpCode?: string;

  @ApiPropertyOptional({ description: 'Firebase Auth ID token', example: 'eyJhbGci...' })
  @IsOptional()
  @IsString()
  firebaseIdToken?: string;

  @ApiPropertyOptional({ description: 'Google ID token for Google upgrade', example: 'eyJhbGci...' })
  @IsOptional()
  @IsString()
  googleIdToken?: string;

  @ApiPropertyOptional({ description: 'User email for email upgrade', example: 'user@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Password for email upgrade', example: 'SecureP@ss123' })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiPropertyOptional({ description: 'Display name', example: 'John Doe' })
  @IsOptional()
  @IsString()
  displayName?: string;
}

export class GuestMigrateDto {
  @ApiPropertyOptional({ description: 'Auth token of target registered account', example: 'eyJhbGci...' })
  @IsOptional()
  @IsString()
  targetAuthToken?: string;

  @ApiPropertyOptional({ description: 'Target user ID to merge guest data into', example: 'usr_882910' })
  @IsOptional()
  @IsString()
  targetUserId?: string;
}
