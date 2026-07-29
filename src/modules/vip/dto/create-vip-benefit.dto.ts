import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  Min,
  Max,
  IsObject,
} from 'class-validator';

export class CreateVipBenefitDto {
  @ApiProperty({ example: 'animated_profile_frame' })
  @IsString()
  key: string;

  @ApiProperty({ example: 'Animated Profile Frames' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Exclusive frame around avatar' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'visual' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    example: 'https://cdn.voicecloud.app/icons/frame.png',
  })
  @IsOptional()
  @IsString()
  iconUrl?: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @Min(1)
  @Max(10)
  minVipLevel: number;

  @ApiPropertyOptional({ example: { frameUrl: 'frame1.png' } })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
