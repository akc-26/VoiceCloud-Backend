import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsArray,
} from 'class-validator';

export class ApplyAgencyDto {
  @ApiProperty({ example: 'Starlight Talent Agency' })
  @IsString()
  @IsNotEmpty()
  agencyName: string;

  @ApiProperty({ example: 'Starlight Media LLC' })
  @IsString()
  @IsNotEmpty()
  legalName: string;

  @ApiProperty({ example: 'TAX-998822' })
  @IsString()
  @IsNotEmpty()
  taxId: string;

  @ApiProperty({ example: 'REG-2026-881' })
  @IsString()
  @IsNotEmpty()
  businessRegistrationNumber: string;

  @ApiProperty({ example: '100 Innovation Way, Suite 400, New York, NY' })
  @IsString()
  @IsNotEmpty()
  businessAddress: string;

  @ApiProperty({ example: 'contact@starlightagency.com' })
  @IsEmail()
  @IsNotEmpty()
  contactEmail: string;

  @ApiProperty({ example: '+1-555-0192' })
  @IsString()
  @IsNotEmpty()
  contactPhone: string;

  @ApiPropertyOptional({ example: 'https://starlightagency.com' })
  @IsOptional()
  @IsString()
  website?: string;

  @ApiProperty({ example: 'United States' })
  @IsString()
  @IsNotEmpty()
  country: string;

  @ApiPropertyOptional({ example: 'English, Spanish' })
  @IsOptional()
  @IsString()
  languages?: string;

  @ApiPropertyOptional({ example: 'Music, Talk Show, Gaming' })
  @IsOptional()
  @IsString()
  categories?: string;

  @ApiPropertyOptional({
    example: 'Premier talent management agency for live voice hosts.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: ['https://cdn.voicecloud.app/docs/license.pdf'],
  })
  @IsOptional()
  @IsArray()
  documents?: string[];
}
