import {
  IsString,
  IsArray,
  IsEnum,
  IsOptional,
  IsNumber,
  ArrayMinSize,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PollType } from '../entities/poll.entity';

export class CreatePollDto {
  @ApiProperty({ description: 'Room ID' })
  @IsString()
  roomId: string;

  @ApiProperty({ description: 'Poll question / title', example: 'Which song should we play next?' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ enum: PollType, default: PollType.SINGLE })
  @IsOptional()
  @IsEnum(PollType)
  pollType?: PollType = PollType.SINGLE;

  @ApiProperty({
    description: 'Poll options (at least 2 required)',
    example: ['Option A', 'Option B', 'Option C'],
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(2)
  options: string[];

  @ApiPropertyOptional({ description: 'Duration in seconds before auto-closing', example: 300 })
  @IsOptional()
  @IsNumber()
  @Min(10)
  durationSeconds?: number;
}
