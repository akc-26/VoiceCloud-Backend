import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SuspendUserDto {
  @ApiProperty({
    example: 'Violation of community safety guidelines',
    description: 'Reason for suspension',
  })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiPropertyOptional({
    example: 1440,
    description: 'Duration in minutes (e.g. 1440 = 24 hours)',
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  durationMinutes?: number;

  @ApiPropertyOptional({
    example: false,
    description: 'Indicates whether the suspension is permanent',
  })
  @IsBoolean()
  @IsOptional()
  isPermanent?: boolean;

  @ApiPropertyOptional({
    example: 'Action triggered after report approval',
    description: 'Additional internal moderation notes',
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
