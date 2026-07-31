import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
} from 'class-validator';
import { VisibilityType } from '../../../common/enums';

export class CreateClubDto {
  @ApiProperty({ description: 'Club display name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Unique club handle or slug' })
  @IsString()
  @IsNotEmpty()
  handle: string;

  @ApiPropertyOptional({ description: 'Club description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Club avatar/logo URL' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'Club banner/cover image URL' })
  @IsOptional()
  @IsString()
  bannerUrl?: string;

  @ApiPropertyOptional({ description: 'Primary category', default: 'General' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'List of club rules', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  rules?: string[];

  @ApiPropertyOptional({ enum: VisibilityType, default: VisibilityType.PUBLIC })
  @IsOptional()
  @IsEnum(VisibilityType)
  visibility?: VisibilityType;
}
