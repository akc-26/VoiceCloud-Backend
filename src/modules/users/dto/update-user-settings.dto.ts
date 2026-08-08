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

  @ApiPropertyOptional({ example: '324' })
  @IsOptional()
  @IsString()
  audioPreset?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  noiseSuppression?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  echoCancellation?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  agc?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  micQueue?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  toxicityFilter?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  followersOnlyChat?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  emailAlerts?: boolean;

  @ApiPropertyOptional({ example: 'rtmp' })
  @IsOptional()
  @IsString()
  preferredProtocol?: string;

  @ApiPropertyOptional({ example: 'ultra_low' })
  @IsOptional()
  @IsString()
  latencyMode?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  recordingPreference?: boolean;

  @ApiPropertyOptional({ example: { defaultBitrate: '324' } })
  @IsOptional()
  @IsObject()
  streamingPreferences?: Record<string, any>;
}
