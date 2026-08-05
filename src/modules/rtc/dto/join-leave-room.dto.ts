import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SpeakerRole } from '../entities/rtc-speaker-history.entity';

export class JoinRoomDto {
  @ApiProperty({ description: 'Room ID to join', example: 'room-123' })
  @IsString()
  roomId: string;

  @ApiPropertyOptional({
    description: 'Requested participant role',
    enum: SpeakerRole,
    default: SpeakerRole.LISTENER,
  })
  @IsOptional()
  @IsEnum(SpeakerRole)
  role?: SpeakerRole;

  @ApiPropertyOptional({
    description: 'Device information / client identifier',
  })
  @IsOptional()
  @IsString()
  deviceInfo?: string;
}

export class LeaveRoomDto {
  @ApiProperty({ description: 'Room ID to leave', example: 'room-123' })
  @IsString()
  roomId: string;
}

export class RejoinRoomDto {
  @ApiProperty({ description: 'Room ID to rejoin', example: 'room-123' })
  @IsString()
  roomId: string;

  @ApiPropertyOptional({ description: 'Previous token for state validation' })
  @IsOptional()
  @IsString()
  previousToken?: string;
}

export class ForceDisconnectDto {
  @ApiProperty({ description: 'Room ID', example: 'room-123' })
  @IsString()
  roomId: string;

  @ApiProperty({
    description: 'Target user ID to force disconnect',
    example: 'user-456',
  })
  @IsString()
  targetUserId: string;

  @ApiPropertyOptional({
    description: 'Reason for force disconnect',
    example: 'Policy violation',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class RefreshRtcTokenDto {
  @ApiProperty({ description: 'Room ID', example: 'room-123' })
  @IsString()
  roomId: string;

  @ApiProperty({ description: 'Current expired or near-expiry token' })
  @IsString()
  oldToken: string;

  @ApiPropertyOptional({ description: 'Participant role', enum: SpeakerRole })
  @IsOptional()
  @IsEnum(SpeakerRole)
  role?: SpeakerRole;

  @ApiPropertyOptional({ description: 'Expiration in seconds', example: 3600 })
  @IsOptional()
  @IsNumber()
  expirationSeconds?: number;
}

export class SpeakingStateDto {
  @ApiProperty({ description: 'Room ID', example: 'room-123' })
  @IsString()
  roomId: string;

  @ApiProperty({
    description: 'Whether the participant is actively speaking',
    example: true,
  })
  @IsBoolean()
  isSpeaking: boolean;

  @ApiPropertyOptional({
    description: 'Audio input level (0-100)',
    example: 75,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  audioLevel?: number;
}

// Backward-compatible source export; the runtime class name stays unique for Swagger.
export { RefreshRtcTokenDto as RefreshTokenDto };
