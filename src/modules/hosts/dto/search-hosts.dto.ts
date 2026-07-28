import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { HostVerificationStatus } from '../entities/host-profile.entity';

export class SearchHostsDto {
  @ApiPropertyOptional({ example: 'John' })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional({ example: 'United States' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ example: 'English' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({
    enum: HostVerificationStatus,
    example: HostVerificationStatus.APPROVED,
  })
  @IsOptional()
  @IsEnum(HostVerificationStatus)
  status?: HostVerificationStatus;
}
