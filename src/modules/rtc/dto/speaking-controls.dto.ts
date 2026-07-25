import {
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  IsEnum,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AudioQualityProfile } from '../entities/rtc-session.entity';

export class RaiseHandDto {
  @ApiPropertyOptional({ example: 1, description: 'Requested seat index' })
  @IsOptional()
  @IsInt()
  @Min(0)
  seatIndex?: number;
}

export class SpeakerActionDto {
  @ApiProperty({
    example: 'target-user-uuid-123',
    description: 'Target user ID',
  })
  @IsString()
  targetUserId: string;

  @ApiPropertyOptional({ example: 1, description: 'Seat index' })
  @IsOptional()
  @IsInt()
  @Min(0)
  seatIndex?: number;
}

export class MuteUserDto {
  @ApiProperty({ example: 'target-user-uuid-123' })
  @IsString()
  targetUserId: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  mute: boolean;
}

export class LockSeatDto {
  @ApiProperty({ example: 1, description: 'Seat index' })
  @IsInt()
  @Min(0)
  seatIndex: number;

  @ApiProperty({ example: true, description: 'Lock or unlock seat' })
  @IsBoolean()
  lock: boolean;
}

export class AudioProfileDto {
  @ApiProperty({
    enum: AudioQualityProfile,
    example: AudioQualityProfile.HIGH_QUALITY,
  })
  @IsEnum(AudioQualityProfile)
  qualityProfile: AudioQualityProfile;
}
