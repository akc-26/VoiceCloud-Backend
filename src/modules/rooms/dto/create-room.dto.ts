import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateRoomDto {
  @ApiProperty({ description: 'Room title' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Room description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Room category',
    default: 'Audio Lounge',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    description: 'Audio quality profile',
    default: '324kbps Ultra HD',
  })
  @IsOptional()
  @IsString()
  audioQuality?: string;

  @ApiPropertyOptional({ description: 'Language code', default: 'en' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ description: 'Cover image URL' })
  @IsOptional()
  @IsString()
  coverUrl?: string;

  @ApiPropertyOptional({ description: 'Associated Club ID' })
  @IsOptional()
  @IsUUID()
  clubId?: string;

  @ApiPropertyOptional({ description: 'Associated Scheduled Room ID' })
  @IsOptional()
  @IsUUID()
  scheduledRoomId?: string;

  @ApiPropertyOptional({ description: 'Is room locked', default: false })
  @IsOptional()
  @IsBoolean()
  isLocked?: boolean;

  @ApiPropertyOptional({ description: 'Is premium room', default: false })
  @IsOptional()
  @IsBoolean()
  isPremium?: boolean;

  @ApiPropertyOptional({
    description: 'Is ticket required to enter',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isTicketRequired?: boolean;

  @ApiPropertyOptional({ description: 'Ticket price in USD', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  ticketPriceAmount?: number;

  @ApiPropertyOptional({ description: 'Is subscriber only', default: false })
  @IsOptional()
  @IsBoolean()
  isSubscriberOnly?: boolean;

  @ApiPropertyOptional({
    description: 'Restrict room entry to verified users',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isVerifiedOnly?: boolean;

  @ApiPropertyOptional({ description: 'Is invite only', default: false })
  @IsOptional()
  @IsBoolean()
  isInviteOnly?: boolean;
}
