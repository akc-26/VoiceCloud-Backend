import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StreamCredentialsResponseDto {
  @ApiProperty({ example: 'rtmps://live.voicecloud.app:443/live' })
  rtmpUrl: string;

  @ApiPropertyOptional({ example: 'webrtc://live.voicecloud.app:443/live' })
  webrtcUrl?: string;

  @ApiProperty({ example: 'live_vc_sk_8f93a1200bc4291e9b210452f129a002' })
  streamKey: string;

  @ApiProperty({ example: '324' })
  audioBitrate: string;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiPropertyOptional({ example: '2026-07-31T07:00:00.000Z' })
  lastRegeneratedAt?: Date;
}
