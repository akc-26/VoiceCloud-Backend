import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
} from 'class-validator';
import { CmsPageStatus, CmsPageVisibility } from '../entities/cms-page.entity';

export class CreateCmsPageDto {
  @ApiProperty({ description: 'Page Title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'URL Slug e.g. privacy-policy' })
  @IsString()
  @IsNotEmpty()
  slug: string;

  @ApiProperty({ description: 'Rich HTML / Markdown content' })
  @IsString()
  @IsNotEmpty()
  contentHtml: string;

  @ApiPropertyOptional({ description: 'SEO Page Title' })
  @IsOptional()
  @IsString()
  seoTitle?: string;

  @ApiPropertyOptional({ description: 'SEO Description' })
  @IsOptional()
  @IsString()
  seoDescription?: string;

  @ApiPropertyOptional({ description: 'Keywords list', type: [String] })
  @IsOptional()
  @IsArray()
  keywords?: string[];

  @ApiPropertyOptional({
    enum: CmsPageStatus,
    default: CmsPageStatus.PUBLISHED,
  })
  @IsOptional()
  @IsEnum(CmsPageStatus)
  status?: CmsPageStatus;

  @ApiPropertyOptional({
    enum: CmsPageVisibility,
    default: CmsPageVisibility.PUBLIC,
  })
  @IsOptional()
  @IsEnum(CmsPageVisibility)
  visibility?: CmsPageVisibility;
}

export class UpdateCmsPageDto {
  @ApiPropertyOptional({ description: 'Page Title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Rich HTML content' })
  @IsOptional()
  @IsString()
  contentHtml?: string;

  @ApiPropertyOptional({ description: 'SEO Page Title' })
  @IsOptional()
  @IsString()
  seoTitle?: string;

  @ApiPropertyOptional({ description: 'SEO Description' })
  @IsOptional()
  @IsString()
  seoDescription?: string;

  @ApiPropertyOptional({ description: 'Keywords list', type: [String] })
  @IsOptional()
  @IsArray()
  keywords?: string[];

  @ApiPropertyOptional({ enum: CmsPageStatus })
  @IsOptional()
  @IsEnum(CmsPageStatus)
  status?: CmsPageStatus;

  @ApiPropertyOptional({ enum: CmsPageVisibility })
  @IsOptional()
  @IsEnum(CmsPageVisibility)
  visibility?: CmsPageVisibility;
}
