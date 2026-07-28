import { IsString, IsOptional, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class StartRecordingDto {
  @ApiProperty({ example: 'session-uuid-1234' })
  @IsString()
  sessionId: string;

  @ApiProperty({ example: 'room-uuid-1234' })
  @IsString()
  roomId: string;

  @ApiPropertyOptional({ example: 'grid', description: 'Layout preset' })
  @IsOptional()
  @IsString()
  layout?: string;
}

export class QueryRtcSessionsDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ example: 'room-uuid-1234' })
  @IsOptional()
  @IsString()
  roomId?: string;

  @ApiPropertyOptional({ example: 'active' })
  @IsOptional()
  @IsString()
  status?: string;
}
