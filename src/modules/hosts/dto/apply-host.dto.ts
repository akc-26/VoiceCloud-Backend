import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';

export class ApplyHostDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  realName: string;

  @ApiProperty({ example: 'ID-987654321' })
  @IsString()
  @IsNotEmpty()
  idNumber: string;

  @ApiProperty({ example: 'https://cdn.voicecloud.app/documents/id-front.jpg' })
  @IsString()
  @IsNotEmpty()
  documentUrl: string;

  @ApiProperty({ example: 'https://cdn.voicecloud.app/documents/selfie.jpg' })
  @IsString()
  @IsNotEmpty()
  selfieUrl: string;

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
