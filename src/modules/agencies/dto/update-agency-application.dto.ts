import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApplicationStatus } from '../entities/agency-application.entity';

export class UpdateAgencyApplicationDto {
  @ApiProperty({ enum: ApplicationStatus, example: ApplicationStatus.APPROVED })
  @IsEnum(ApplicationStatus)
  status: ApplicationStatus;

  @ApiPropertyOptional({
    example: 'Verified tax ID and business registration.',
  })
  @IsOptional()
  @IsString()
  reviewNotes?: string;
}
