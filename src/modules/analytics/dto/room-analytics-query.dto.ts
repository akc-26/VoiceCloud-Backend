import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum AnalyticsTimeframe {
  REALTIME = 'realtime',
  LAST_24H = '24h',
  LAST_7D = '7d',
  LAST_30D = '30d',
}

export class RoomAnalyticsQueryDto {
  @ApiPropertyOptional({
    description: 'Timeframe granularity for analytics report',
    enum: AnalyticsTimeframe,
    default: AnalyticsTimeframe.REALTIME,
  })
  @IsEnum(AnalyticsTimeframe)
  @IsOptional()
  timeframe?: AnalyticsTimeframe = AnalyticsTimeframe.REALTIME;
}
