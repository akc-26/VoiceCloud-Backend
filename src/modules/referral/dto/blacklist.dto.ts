import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { BlacklistType } from '../enums/referral.enums';

export class AddBlacklistDto {
  @ApiProperty({
    enum: BlacklistType,
    description: 'Type of blacklist (IP, DEVICE, USER)',
  })
  @IsEnum(BlacklistType)
  type: BlacklistType;

  @ApiProperty({
    description: 'Value to blacklist (IP address, Device ID, or User ID)',
  })
  @IsNotEmpty()
  @IsString()
  value: string;

  @ApiPropertyOptional({ description: 'Reason for blacklisting' })
  @IsOptional()
  @IsString()
  reason?: string;
}
