import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
  IsUUID,
  IsInt,
  IsBoolean,
  IsNumber,
  IsDateString,
  Min,
  Max,
  IsObject,
} from 'class-validator';
import { VisibilityType } from '../../../common/enums';

export class CreateScheduledRoomDto {
  @ApiProperty({ description: 'Scheduled room title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: 'Detailed room description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Category', default: 'General' })
  @IsOptional()
  @IsString()
  category?: string = 'General';

  @ApiPropertyOptional({ description: 'Primary language', default: 'en' })
  @IsOptional()
  @IsString()
  language?: string = 'en';

  @ApiPropertyOptional({ description: 'Tags list', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Cover image URL' })
  @IsOptional()
  @IsString()
  coverUrl?: string;

  @ApiPropertyOptional({ description: 'Associated Club ID' })
  @IsOptional()
  @IsUUID()
  clubId?: string;

  @ApiProperty({ description: 'Scheduled start time (ISO Date string)' })
  @IsDateString()
  @IsNotEmpty()
  scheduledStartTime: string;

  @ApiPropertyOptional({ description: 'Estimated duration in minutes', default: 60 })
  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(1440)
  durationMinutes?: number = 60;

  @ApiPropertyOptional({ description: 'Time zone string', default: 'UTC' })
  @IsOptional()
  @IsString()
  timeZone?: string = 'UTC';

  @ApiPropertyOptional({ enum: VisibilityType, default: VisibilityType.PUBLIC })
  @IsOptional()
  @IsEnum(VisibilityType)
  visibility?: VisibilityType = VisibilityType.PUBLIC;

  @ApiPropertyOptional({ description: 'Invite-only flag', default: false })
  @IsOptional()
  @IsBoolean()
  isInviteOnly?: boolean = false;

  @ApiPropertyOptional({ description: 'Maximum allowed participants', default: 500 })
  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(10000)
  maxParticipants?: number = 500;

  @ApiPropertyOptional({ description: 'Is premium / paid room', default: false })
  @IsOptional()
  @IsBoolean()
  isPremium?: boolean = false;

  @ApiPropertyOptional({ description: 'Ticket price in USD', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  ticketPriceAmount?: number = 0;

  @ApiPropertyOptional({ description: 'Currency code', default: 'USD' })
  @IsOptional()
  @IsString()
  currency?: string = 'USD';

  @ApiPropertyOptional({ description: 'Reminder settings JSON' })
  @IsOptional()
  @IsObject()
  reminderSettings?: Record<string, boolean>;
}
