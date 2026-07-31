import {
  IsString,
  IsBoolean,
  IsOptional,
  IsObject,
  IsIn,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserSettingsDto {
  @ApiPropertyOptional({
    example: 'everyone',
    description: 'everyone | following | friends | none',
  })
  @IsOptional()
  @IsString()
  @IsIn(['everyone', 'following', 'friends', 'none'])
  messagingPermission?: string;

  @ApiPropertyOptional({
    example: 'everyone',
    description: 'everyone | approval | none',
  })
  @IsOptional()
  @IsString()
  @IsIn(['everyone', 'approval', 'none'])
  followPermission?: string;

  @ApiPropertyOptional({
    example: 'everyone',
    description: 'everyone | friends | none',
  })
  @IsOptional()
  @IsString()
  @IsIn(['everyone', 'friends', 'none'])
  invitationPermission?: string;

  @ApiPropertyOptional({
    example: 'everyone',
    description: 'everyone | friends | none',
  })
  @IsOptional()
  @IsString()
  @IsIn(['everyone', 'friends', 'none'])
  visitorPermission?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Allow profile visitors to be logged',
  })
  @IsOptional()
  @IsBoolean()
  allowVisitorTracking?: boolean;

  @ApiPropertyOptional({
    example: false,
    description: 'Visit other profiles anonymously by default',
  })
  @IsOptional()
  @IsBoolean()
  anonymousVisiting?: boolean;

  @ApiPropertyOptional({ example: { email: true, push: true, inApp: true } })
  @IsOptional()
  @IsObject()
  notificationPreferences?: Record<string, boolean>;

  @ApiPropertyOptional({ example: 'en' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ example: 'light' })
  @IsOptional()
  @IsString()
  theme?: string;

  @ApiPropertyOptional({ example: 'America/New_York' })
  @IsOptional()
  @IsString()
  timezone?: string;
}
