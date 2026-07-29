import {
  IsString,
  IsOptional,
  IsArray,
  IsObject,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Alex Morgan' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  displayName?: string;

  @ApiPropertyOptional({ example: 'alex_m' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Matches(/^[a-zA-Z0-9_.-]+$/, {
    message:
      'Username can only contain alphanumeric characters, underscores, hyphens, and dots',
  })
  username?: string;

  @ApiPropertyOptional({ example: 'VoiceCloud podcaster and tech enthusiast' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @ApiPropertyOptional({ example: 'Available for live audio sessions' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  statusMessage?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/cover.jpg' })
  @IsOptional()
  @IsString()
  coverUrl?: string;

  @ApiPropertyOptional({ example: 'male' })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiPropertyOptional({ example: 'US' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ example: 'en' })
  @IsOptional()
  @IsString()
  preferredLanguage?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['podcast', 'technology', 'music'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  interests?: string[];

  @ApiPropertyOptional({
    example: {
      twitter: 'https://twitter.com/alex',
      github: 'https://github.com/alex',
    },
  })
  @IsOptional()
  @IsObject()
  socialLinks?: Record<string, string>;

  @ApiPropertyOptional({
    type: [String],
    example: ['audio-host', 'tech-lead', 'top-creator'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  customTags?: string[];
}
