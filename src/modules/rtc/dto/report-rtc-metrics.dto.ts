import { IsString, IsNumber, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReportRtcMetricsDto {
  @ApiProperty({ description: 'Room ID' })
  @IsString()
  roomId: string;

  @ApiPropertyOptional({ description: 'Voice Session ID' })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiProperty({ description: 'Bitrate in kbps', example: 128 })
  @IsNumber()
  @Min(0)
  bitrate: number;

  @ApiProperty({ description: 'Packet loss percentage (0-100)', example: 1.5 })
  @IsNumber()
  @Min(0)
  @Max(100)
  packetLoss: number;

  @ApiProperty({ description: 'Jitter in ms', example: 12 })
  @IsNumber()
  @Min(0)
  jitter: number;

  @ApiProperty({ description: 'Round Trip Time in ms', example: 45 })
  @IsNumber()
  @Min(0)
  rtt: number;

  @ApiPropertyOptional({
    description: 'Audio input level (0-100)',
    example: 80,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  audioLevel?: number;

  @ApiPropertyOptional({
    description: 'Provider connection state',
    example: 'connected',
  })
  @IsOptional()
  @IsString()
  providerConnectionState?: string;
}
