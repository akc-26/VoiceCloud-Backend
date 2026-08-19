import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class HostLevelBenefitSettingsDto {
  @ApiProperty({ example: 'priority_discovery' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9_]{1,64}$/)
  key: string;

  @ApiProperty({ example: 'Priority placement in Host discovery' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  label: string;
}

export class HostLevelSettingsDto {
  @ApiProperty({ example: 1, minimum: 1, maximum: 100 })
  @IsInt()
  @Min(1)
  @Max(100)
  level: number;

  @ApiProperty({ example: 'Starter Host' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 0, minimum: 0, maximum: 1000000000 })
  @IsInt()
  @Min(0)
  @Max(1_000_000_000)
  minimumXp: number;

  @ApiProperty({ type: [HostLevelBenefitSettingsDto] })
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => HostLevelBenefitSettingsDto)
  benefits: HostLevelBenefitSettingsDto[];
}

export class UpdateHostBusinessSettingsDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  applicationsEnabled: boolean;

  @ApiProperty({ example: 50, minimum: 0, maximum: 1000000 })
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  minFollowers: number;

  @ApiProperty({ example: 3, minimum: 0, maximum: 1000000 })
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  minCompletedRooms: number;

  @ApiProperty({ example: true })
  @IsBoolean()
  requireGoodStanding: boolean;

  @ApiProperty({ type: [HostLevelSettingsDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => HostLevelSettingsDto)
  levels: HostLevelSettingsDto[];
}

export class HostBusinessSettingsResponseDto extends UpdateHostBusinessSettingsDto {
  @ApiProperty({ example: '2026-08-03T17:00:00.000Z' })
  updatedAt: string;
}
