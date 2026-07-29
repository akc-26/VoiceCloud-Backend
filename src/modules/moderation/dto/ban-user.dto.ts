import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BanUserDto {
  @ApiProperty({
    example: 'Severe abuse or illegal activity',
    description: 'Reason for banning user',
  })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiPropertyOptional({
    example: 10080,
    description: 'Duration in minutes (e.g. 10080 = 7 days)',
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  durationMinutes?: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Set true for permanent ban',
  })
  @IsBoolean()
  @IsOptional()
  isPermanent?: boolean = true;

  @ApiPropertyOptional({
    example: 'Permanent ban requested by senior moderator',
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
