import { IsString, IsNotEmpty, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MuteUserDto {
  @ApiProperty({
    example: 'Spamming voice room audio',
    description: 'Reason for muting user',
  })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiProperty({
    example: 60,
    description: 'Mute duration in minutes (e.g. 60 = 1 hour)',
  })
  @IsInt()
  @Min(1)
  durationMinutes: number;

  @ApiPropertyOptional({
    example: 'Muted by room moderator',
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
