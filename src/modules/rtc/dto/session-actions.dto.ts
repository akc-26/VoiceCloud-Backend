import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AudioQualityProfile } from '../entities/rtc-session.entity';

export class StartSessionDto {
  @ApiProperty({ example: 'room-uuid-1234' })
  @IsString()
  roomId: string;

  @ApiPropertyOptional({
    enum: AudioQualityProfile,
    default: AudioQualityProfile.SPEECH,
  })
  @IsOptional()
  @IsEnum(AudioQualityProfile)
  qualityProfile?: AudioQualityProfile;
}

export class StopSessionDto {
  @ApiProperty({ example: 'session-uuid-1234' })
  @IsString()
  sessionId: string;
}
