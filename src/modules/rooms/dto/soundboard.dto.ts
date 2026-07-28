import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, Max, IsBoolean, IsArray, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum SoundEffectCategory {
  APPLAUSE = 'applause',
  CHEERING = 'cheering',
  LAUGHTER = 'laughter',
  DRUMROLL = 'drumroll',
  AIRHORN = 'airhorn',
  BUZZER = 'buzzer',
  CELEBRATION = 'celebration',
  CUSTOM = 'custom',
}

export enum BgmState {
  PLAYING = 'playing',
  PAUSED = 'paused',
  STOPPED = 'stopped',
}

export class TriggerSoundEffectDto {
  @ApiProperty({
    description: 'Identifier or category of sound effect to trigger',
    enum: SoundEffectCategory,
    example: SoundEffectCategory.APPLAUSE,
  })
  @IsEnum(SoundEffectCategory)
  @IsNotEmpty()
  category: SoundEffectCategory;

  @ApiPropertyOptional({
    description: 'Custom sound effect URL if category is custom',
    example: 'https://cdn.voicecloud.com/sounds/custom-applause.mp3',
  })
  @IsString()
  @IsOptional()
  customAudioUrl?: string;

  @ApiPropertyOptional({
    description: 'Playback volume percentage (0 - 100)',
    default: 100,
    example: 80,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  volume?: number = 100;
}

export class UpdateRoomBgmDto {
  @ApiProperty({
    description: 'URL of the background music track',
    example: 'https://cdn.voicecloud.com/bgm/chill-lofi.mp3',
  })
  @IsString()
  @IsNotEmpty()
  audioUrl: string;

  @ApiPropertyOptional({
    description: 'BGM Track title',
    example: 'Midnight Chill Lofi',
  })
  @IsString()
  @IsOptional()
  trackTitle?: string;

  @ApiPropertyOptional({
    description: 'Playback state of BGM',
    enum: BgmState,
    default: BgmState.PLAYING,
  })
  @IsEnum(BgmState)
  @IsOptional()
  state?: BgmState = BgmState.PLAYING;

  @ApiPropertyOptional({
    description: 'Volume percentage (0 - 100)',
    default: 50,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  volume?: number = 50;

  @ApiPropertyOptional({
    description: 'Whether track should auto-loop',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  loop?: boolean = true;
}
