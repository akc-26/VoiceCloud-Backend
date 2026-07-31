import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsDateString,
} from 'class-validator';

export class CreateHostRoomDto {
  @ApiProperty({ example: 'Nightly Acoustic Jam Session' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ example: 'Music' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: 'SCHEDULED', enum: ['INSTANT', 'SCHEDULED'] })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ example: '2026-08-01T20:00:00Z' })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @ApiPropertyOptional({ example: 'FREQ=WEEKLY;BYDAY=MO,WE,FR' })
  @IsOptional()
  @IsString()
  recurrenceRule?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;
}
