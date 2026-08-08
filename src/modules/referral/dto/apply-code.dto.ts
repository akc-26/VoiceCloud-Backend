import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ApplyReferralCodeDto {
  @ApiProperty({ description: 'Referral code to apply', example: 'REF-A1B2C3' })
  @IsNotEmpty()
  @IsString()
  referralCode: string;

  @ApiPropertyOptional({
    description: 'Client IP address',
    example: '192.168.1.1',
  })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiPropertyOptional({
    description: 'Client Device ID / Fingerprint',
    example: 'device-xyz-123',
  })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiPropertyOptional({ description: 'ISO Country Code', example: 'US' })
  @IsOptional()
  @IsString()
  country?: string;
}
