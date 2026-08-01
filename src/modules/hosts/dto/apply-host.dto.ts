import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';

export class ApplyHostDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  realName: string;

  @ApiPropertyOptional({ example: 'ID-987654321' })
  @IsString()
  @IsOptional()
  idNumber?: string;

  @ApiPropertyOptional({ example: 'https://cdn.voicecloud.app/documents/id-front.jpg' })
  @IsString()
  @IsOptional()
  documentUrl?: string;

  @ApiPropertyOptional({ example: 'https://cdn.voicecloud.app/documents/selfie.jpg' })
  @IsString()
  @IsOptional()
  selfieUrl?: string;

  @ApiPropertyOptional({
    example: 'Professional live streamer with 3 years of podcast experience.',
  })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({ example: ['English', 'Spanish'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  languages?: string[];

  @ApiPropertyOptional({ example: ['Music', 'Talk Show', 'Gaming'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @ApiPropertyOptional({ example: 'United States' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ example: '3 years in live audio hosting' })
  @IsOptional()
  @IsString()
  experience?: string;
}
