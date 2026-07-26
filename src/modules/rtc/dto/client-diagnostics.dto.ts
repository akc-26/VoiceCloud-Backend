import { IsString, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ClientDiagnosticsDto {
  @ApiProperty({ example: 'room-uuid-1234', description: 'Room ID' })
  @IsString()
  roomId: string;

  @ApiPropertyOptional({
    example: 45.5,
    description: 'Latency in milliseconds',
  })
  @IsOptional()
  @IsNumber()
  latency?: number;

  @ApiPropertyOptional({ example: 3.2, description: 'Jitter in milliseconds' })
  @IsOptional()
  @IsNumber()
  jitter?: number;

  @ApiPropertyOptional({ example: 0.01, description: 'Packet loss ratio' })
  @IsOptional()
  @IsNumber()
  packetLoss?: number;

  @ApiPropertyOptional({
    example: 64000,
    description: 'Audio bitrate in bits per second',
  })
  @IsOptional()
  @IsNumber()
  audioBitrate?: number;

  @ApiPropertyOptional({ example: 'opus', description: 'Audio codec' })
  @IsOptional()
  @IsString()
  audioCodec?: string;

  @ApiPropertyOptional({ example: 'Pixel 7', description: 'Device model' })
  @IsOptional()
  @IsString()
  deviceModel?: string;

  @ApiPropertyOptional({ example: 'Android 14', description: 'OS version' })
  @IsOptional()
  @IsString()
  osVersion?: string;

  @ApiPropertyOptional({ example: '1.0.0', description: 'App version' })
  @IsOptional()
  @IsString()
  appVersion?: string;

  @ApiPropertyOptional({
    example: 1710000000000,
    description: 'Telemetry timestamp (ISO string or epoch ms)',
  })
  @IsOptional()
  timestamp?: number | string | Date;
}
