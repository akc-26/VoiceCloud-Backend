import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray } from 'class-validator';

export class UpdateHostProfileDto {
  @ApiPropertyOptional({ example: 'Updated bio and podcast schedule.' })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({ example: ['English', 'French'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  languages?: string[];

  @ApiPropertyOptional({ example: ['Music', 'Talk Show'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @ApiPropertyOptional({ example: 'Canada' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ example: '4 years of voice broadcasting' })
  @IsOptional()
  @IsString()
  experience?: string;

  @ApiPropertyOptional({ example: '{"Mon":"20:00-23:00","Wed":"20:00-23:00"}' })
  @IsOptional()
  @IsString()
  availabilitySchedule?: string;
}
