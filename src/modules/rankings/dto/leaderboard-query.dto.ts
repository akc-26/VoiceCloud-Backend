import { IsOptional, IsEnum, IsInt, Min, Max, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum LeaderboardTimeframe {
  GLOBAL = 'global',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  ALL_TIME = 'all_time',
}

export enum LeaderboardCategory {
  USERS = 'users',
  HOSTS = 'hosts',
  AGENCIES = 'agencies',
  CLUBS = 'clubs',
  ROOMS = 'rooms',
  VIP = 'vip',
  CREATORS = 'creators',
  GIFT_SENDERS = 'gift-senders',
  GIFT_RECEIVERS = 'gift-receivers',
}

export class LeaderboardQueryDto {
  @ApiPropertyOptional({
    enum: LeaderboardTimeframe,
    default: LeaderboardTimeframe.GLOBAL,
    description: 'Timeframe scope for the leaderboard',
  })
  @IsOptional()
  @IsEnum(LeaderboardTimeframe)
  timeframe?: LeaderboardTimeframe = LeaderboardTimeframe.GLOBAL;

  @ApiPropertyOptional({
    description:
      'Specific metric e.g. coins, diamonds, gifts_sent, followers, popularity, voice_time, revenue, audience, etc.',
  })
  @IsOptional()
  @IsString()
  metric?: string;

  @ApiPropertyOptional({ description: 'Country filter ISO code (e.g. US, IN)' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ description: 'State or Province filter' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ default: 1, description: 'Page number' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, description: 'Items per page' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
