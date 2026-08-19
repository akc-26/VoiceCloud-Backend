import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class ApplyHostDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  realName: string;

  @ApiPropertyOptional({ example: 'ID-987654321' })
  @IsString()
  @IsOptional()
  idNumber?: string;

  @ApiPropertyOptional({
    example: '6fb2933e-cc1d-4a5b-aaed-789cc8e35b79',
    format: 'uuid',
    description: 'Private Government ID asset owned by the applicant',
  })
  @IsUUID('4')
  @IsOptional()
  governmentIdAssetId?: string;

  @ApiPropertyOptional({
    example: 'd5eaebbf-a880-4df4-b7d8-9ea0461324ce',
    format: 'uuid',
    description: 'Private selfie asset owned by the applicant',
  })
  @IsUUID('4')
  @IsOptional()
  selfieAssetId?: string;

  @ApiPropertyOptional({
    type: [String],
    format: 'uuid',
    description: 'Private supporting-document assets owned by the applicant',
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  supportingDocumentAssetIds?: string[];

  @ApiPropertyOptional({
    example: 'https://cdn.voicecloud.app/documents/id-front.jpg',
    deprecated: true,
    description:
      'Legacy compatibility field pending controlled migration. New clients must use governmentIdAssetId.',
  })
  @IsString()
  @IsOptional()
  documentUrl?: string;

  @ApiPropertyOptional({
    example: 'https://cdn.voicecloud.app/documents/selfie.jpg',
    deprecated: true,
    description:
      'Legacy compatibility field pending controlled migration. New clients must use selfieAssetId.',
  })
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
