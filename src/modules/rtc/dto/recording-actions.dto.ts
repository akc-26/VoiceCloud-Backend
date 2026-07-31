import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PauseRecordingDto {
  @ApiProperty({ description: 'Recording Job ID', example: 'job-123' })
  @IsString()
  jobId: string;

  @ApiPropertyOptional({ description: 'Reason for pausing recording' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class ResumeRecordingDto {
  @ApiProperty({ description: 'Recording Job ID', example: 'job-123' })
  @IsString()
  jobId: string;
}
