import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

import {
  STREAMING_CODECS,
  STREAMING_PROVIDERS,
  STREAMING_REGIONS,
  STREAM_KEY_POLICIES,
} from '../system-settings/system-settings.registry';

export class StreamingInfrastructureSettingsResponseDto {
  @ApiProperty({ enum: STREAMING_PROVIDERS })
  provider: string;

  @ApiProperty()
  rtmpUrl: string;

  @ApiProperty()
  webrtcUrl: string;

  @ApiProperty({ type: [String] })
  turnStunServers: string[];

  @ApiProperty()
  recordingEnabled: boolean;

  @ApiProperty()
  lowLatencyMode: boolean;

  @ApiProperty()
  defaultBitrate: number;

  @ApiProperty({ enum: STREAMING_CODECS })
  codec: string;

  @ApiProperty({ enum: STREAMING_REGIONS })
  region: string;

  @ApiProperty({ enum: STREAM_KEY_POLICIES })
  streamKeyPolicy: string;

  @ApiProperty()
  updatedAt: string;
}

export class UpdateStreamingInfrastructureSettingsDto {
  @ApiProperty({ enum: STREAMING_PROVIDERS })
  @IsString()
  @IsIn(STREAMING_PROVIDERS)
  provider: string;

  @ApiProperty()
  @IsString()
  @Matches(/^rtmps?:\/\/[^\s]+$/i)
  rtmpUrl: string;

  @ApiProperty()
  @IsString()
  @Matches(/^(?:wss?|webrtc):\/\/[^\s]+$/i)
  webrtcUrl: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @Matches(/^(?:turns?|stuns?):[^\s]+$/i, { each: true })
  turnStunServers: string[];

  @ApiProperty()
  @IsBoolean()
  recordingEnabled: boolean;

  @ApiProperty()
  @IsBoolean()
  lowLatencyMode: boolean;

  @ApiProperty({ minimum: 32, maximum: 512 })
  @IsInt()
  @Min(32)
  @Max(512)
  defaultBitrate: number;

  @ApiProperty({ enum: STREAMING_CODECS })
  @IsString()
  @IsIn(STREAMING_CODECS)
  codec: string;

  @ApiProperty({ enum: STREAMING_REGIONS })
  @IsString()
  @IsIn(STREAMING_REGIONS)
  region: string;

  @ApiProperty({ enum: STREAM_KEY_POLICIES })
  @IsString()
  @IsIn(STREAM_KEY_POLICIES)
  streamKeyPolicy: string;
}
