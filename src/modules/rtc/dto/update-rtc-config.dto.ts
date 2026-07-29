import {
  IsEnum,
  IsOptional,
  IsString,
  IsBoolean,
  IsInt,
  IsObject,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { RtcProviderType } from '../entities/rtc-config.entity';

export class UpdateRtcConfigDto {
  @ApiPropertyOptional({
    enum: RtcProviderType,
    example: RtcProviderType.AGORA,
  })
  @IsOptional()
  @IsEnum(RtcProviderType)
  activeProvider?: RtcProviderType;

  @ApiPropertyOptional({ example: 'your_agora_app_id' })
  @IsOptional()
  @IsString()
  appId?: string;

  @ApiPropertyOptional({ example: 'your_agora_app_certificate' })
  @IsOptional()
  @IsString()
  appCertificate?: string;

  @ApiPropertyOptional({ example: 'your_api_key' })
  @IsOptional()
  @IsString()
  apiKey?: string;

  @ApiPropertyOptional({ example: 'your_api_secret' })
  @IsOptional()
  @IsString()
  secret?: string;

  @ApiPropertyOptional({ example: 'us-east-1' })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional({ example: 7200 })
  @IsOptional()
  @IsInt()
  @Min(300)
  tokenExpiration?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  encryptionEnabled?: boolean;

  @ApiPropertyOptional({ example: 'aes-128-xts' })
  @IsOptional()
  @IsString()
  encryptionMode?: string;

  @ApiPropertyOptional({ example: 'secret_encryption_key' })
  @IsOptional()
  @IsString()
  encryptionKey?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  recordingEnabled?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  cloudRecording?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  audioEnabled?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  videoEnabled?: boolean;

  @ApiPropertyOptional({ example: { bitRate: 128 } })
  @IsOptional()
  @IsObject()
  cdnSettings?: Record<string, unknown>;

  @ApiPropertyOptional({
    example: 'https://api.voicecloud.app/v1/rtc/webhooks/agora',
  })
  @IsOptional()
  @IsString()
  callbackUrl?: string;

  @ApiPropertyOptional({ example: 'webhook_secret_key' })
  @IsOptional()
  @IsString()
  webhookSecret?: string;
}
