import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class ReportMessageDto {
  @ApiProperty({
    example: 'spam',
    description: 'Reason for report: spam, harassment, inappropriate, etc.',
  })
  @IsString()
  reason: string;

  @ApiPropertyOptional({
    description: 'Additional context or details for moderator',
  })
  @IsOptional()
  @IsString()
  details?: string;
}

export class ResolveReportDto {
  @ApiProperty({ enum: ['reviewed', 'dismissed', 'actioned'] })
  @IsString()
  status: 'reviewed' | 'dismissed' | 'actioned';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  moderatorNotes?: string;

  @ApiPropertyOptional({
    description: 'If true, soft deletes the reported message',
  })
  @IsOptional()
  deleteMessage?: boolean;
}
