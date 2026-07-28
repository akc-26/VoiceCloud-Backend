import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserAuthProfileDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  username: string;

  @ApiProperty()
  displayName: string;

  @ApiPropertyOptional()
  email?: string;

  @ApiPropertyOptional()
  phoneNumber?: string;

  @ApiPropertyOptional()
  avatarUrl?: string;

  @ApiProperty()
  isVerified: boolean;

  @ApiProperty()
  isVip: boolean;

  @ApiProperty()
  isGuest: boolean;

  @ApiProperty()
  role: string;

  @ApiPropertyOptional()
  referralCode?: string;
}

export class AuthResponseDto {
  @ApiProperty({ description: 'JWT Access Token' })
  accessToken: string;

  @ApiProperty({ description: 'JWT Refresh Token' })
  refreshToken: string;

  @ApiProperty({ description: 'Token Type', example: 'Bearer' })
  tokenType: string;

  @ApiProperty({ description: 'Access token expiration in seconds', example: 3600 })
  expiresIn: number;

  @ApiProperty({ description: 'User Profile' })
  user: UserAuthProfileDto;

  @ApiPropertyOptional({ description: 'Active session ID' })
  sessionId?: string;

  @ApiPropertyOptional({ description: 'Registered device ID' })
  deviceId?: string;
}

export class OtpResponseDto {
  @ApiProperty({ example: 'OTP sent successfully' })
  message: string;

  @ApiPropertyOptional({ example: '2026-07-27T12:00:00Z' })
  expiresAt?: Date;

  @ApiPropertyOptional({ example: 60 })
  resendCooldownSeconds?: number;
}
