import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsUrl,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  AnnouncementTarget,
  AnnouncementPriority,
} from '../entities/announcement.entity';

export class CreateAnnouncementDto {
  @ApiProperty({
    example: 'Scheduled System Update',
    description: 'Announcement Title',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example:
      'New Voice Cloud Features and Performance Enhancements have been deployed.',
    description: 'Announcement Content',
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({
    example: 'https://cdn.voicecloud.com/banner.png',
    description: 'Optional Banner Image or Media URL',
  })
  @IsUrl()
  @IsOptional()
  mediaUrl?: string;

  @ApiPropertyOptional({
    enum: AnnouncementTarget,
    example: AnnouncementTarget.GLOBAL,
    description: 'Target Audience for the announcement',
  })
  @IsEnum(AnnouncementTarget)
  @IsOptional()
  targetAudience?: AnnouncementTarget = AnnouncementTarget.GLOBAL;

  @ApiPropertyOptional({
    enum: AnnouncementPriority,
    example: AnnouncementPriority.HIGH,
    description: 'Priority level of announcement',
  })
  @IsEnum(AnnouncementPriority)
  @IsOptional()
  priority?: AnnouncementPriority = AnnouncementPriority.MEDIUM;

  @ApiPropertyOptional({
    example: '2026-07-25T10:00:00Z',
    description: 'Scheduled release timestamp (ISO 8601 string)',
  })
  @IsDateString()
  @IsOptional()
  scheduledAt?: string;

  @ApiPropertyOptional({
    example: '2026-08-01T00:00:00Z',
    description: 'Expiry timestamp (ISO 8601 string)',
  })
  @IsDateString()
  @IsOptional()
  expiresAt?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether announcement is active',
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;
}
