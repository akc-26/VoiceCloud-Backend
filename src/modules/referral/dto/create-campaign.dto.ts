import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateReferralCampaignDto {
  @ApiProperty({ description: 'Campaign Name', example: 'Summer Referral Festival' })
  @IsNotEmpty()
  @IsString()
  campaignName: string;

  @ApiPropertyOptional({ description: 'Campaign Description', example: 'Invite friends and win exclusive frames!' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Campaign Start Date (ISO)', example: '2026-08-01T00:00:00Z' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'Campaign End Date (ISO)', example: '2026-08-31T23:59:59Z' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ description: 'Active status', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Country restrictions (e.g. ["US", "IN"])', example: ['US', 'IN'] })
  @IsOptional()
  @IsArray()
  countryRestrictions?: string[];

  @ApiPropertyOptional({ description: 'Reward configurations list' })
  @IsOptional()
  @IsArray()
  rewardConfiguration?: Record<string, any>[];

  @ApiPropertyOptional({ description: 'Qualification rules JSON object' })
  @IsOptional()
  @IsObject()
  qualificationRules?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Max referrals per user (0 = unlimited)', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  referralLimits?: number;

  @ApiPropertyOptional({ description: 'Daily limit per user (0 = unlimited)', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  dailyLimits?: number;

  @ApiPropertyOptional({ description: 'Global campaign limit (0 = unlimited)', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  globalLimits?: number;
}
