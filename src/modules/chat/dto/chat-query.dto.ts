import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ChatQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 50;

  @ApiPropertyOptional({ description: 'Search term for content or user names' })
  @IsOptional()
  @IsString()
  search?: string;
}

export class PresenceDto {
  @ApiPropertyOptional({ enum: ['online', 'offline'] })
  @IsString()
  status: 'online' | 'offline';
}

export class TypingDto {
  @ApiPropertyOptional()
  isTyping?: boolean;

  @ApiPropertyOptional()
  isRecording?: boolean;
}
