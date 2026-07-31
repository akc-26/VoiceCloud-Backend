import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

export class HostModerationActionDto {
  @ApiProperty({ example: 'room-uuid-123' })
  @IsString()
  @IsNotEmpty()
  roomId: string;

  @ApiProperty({ example: 'user-uuid-456' })
  @IsString()
  @IsNotEmpty()
  targetUserId: string;

  @ApiProperty({
    example: 'MUTE',
    enum: [
      'KICK',
      'MUTE',
      'TEMP_BAN',
      'PERM_BAN',
      'INVITE_SPEAKER',
      'REMOVE_SPEAKER',
      'ASSIGN_MODERATOR',
      'TRANSFER_HOST',
    ],
  })
  @IsString()
  @IsNotEmpty()
  action: string;

  @ApiPropertyOptional({ example: 'Disruptive background noise' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @IsNumber()
  durationMinutes?: number;

  @ApiPropertyOptional({ example: 'user-uuid-789' })
  @IsOptional()
  @IsString()
  newHostUserId?: string;
}
