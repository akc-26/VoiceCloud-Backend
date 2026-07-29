import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsEnum,
  IsInt,
  IsBoolean,
  IsUUID,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ScheduledRoomStatus, VisibilityType } from '../../../common/enums';

export class QueryScheduledRoomDto {
  @ApiPropertyOptional({
    description: 'Search term for room title or description',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by room category' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Filter by host user ID' })
  @IsOptional()
  @IsUUID()
  hostId?: string;

  @ApiPropertyOptional({ description: 'Filter by associated club ID' })
  @IsOptional()
  @IsUUID()
  clubId?: string;

  @ApiPropertyOptional({
    enum: ScheduledRoomStatus,
    description: 'Filter by status',
  })
  @IsOptional()
  @IsEnum(ScheduledRoomStatus)
  status?: ScheduledRoomStatus;

  @ApiPropertyOptional({
    enum: VisibilityType,
    description: 'Filter by visibility',
  })
  @IsOptional()
  @IsEnum(VisibilityType)
  visibility?: VisibilityType;

  @ApiPropertyOptional({ description: 'Filter by premium/paid room' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isPremium?: boolean;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}
