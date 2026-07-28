import { IsString, IsOptional, IsNumber } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSessionDto {
  @ApiPropertyOptional({ example: 'web' })
  @IsOptional()
  @IsString()
  deviceType?: string;

  @ApiPropertyOptional({ example: 'Chrome Browser' })
  @IsOptional()
  @IsString()
  deviceName?: string;

  @ApiPropertyOptional({ example: '192.168.1.1' })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiPropertyOptional({ example: 'Mozilla/5.0...' })
  @IsOptional()
  @IsString()
  userAgent?: string;

  @ApiPropertyOptional({ example: 86400, description: 'TTL in seconds' })
  @IsOptional()
  @IsNumber()
  ttlSeconds?: number;
}
