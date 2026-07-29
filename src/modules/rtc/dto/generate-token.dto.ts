import { IsString, IsEnum, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SpeakerRole } from '../entities/rtc-speaker-history.entity';

export class GenerateTokenDto {
  @ApiProperty({ example: 'room-uuid-1234', description: 'Room ID' })
  @IsString()
  roomId: string;

  @ApiPropertyOptional({
    enum: SpeakerRole,
    default: SpeakerRole.LISTENER,
    description: 'Target speaker role',
  })
  @IsOptional()
  @IsEnum(SpeakerRole)
  role?: SpeakerRole;

  @ApiPropertyOptional({
    example: 3600,
    description: 'Expiration duration in seconds',
  })
  @IsOptional()
  @IsInt()
  @Min(60)
  expirationSeconds?: number;

  @ApiPropertyOptional({
    example: 'agora',
    description: 'Optional override for RTC provider name',
  })
  @IsOptional()
  @IsString()
  providerOverride?: string;
}
