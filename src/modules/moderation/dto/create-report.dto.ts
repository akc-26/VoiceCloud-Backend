import { IsEnum, IsString, IsOptional, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReportTargetType, ReportReason } from '../entities/report.entity';

export class CreateReportDto {
  @ApiProperty({
    enum: ReportTargetType,
    example: ReportTargetType.USER,
    description: 'Target type being reported',
  })
  @IsEnum(ReportTargetType)
  targetType: ReportTargetType;

  @ApiProperty({
    example: '22222222-2222-2222-2222-222222222222',
    description: 'ID of the target entity (user, room, message, agency, host)',
  })
  @IsString()
  @IsNotEmpty()
  targetId: string;

  @ApiProperty({
    enum: ReportReason,
    example: ReportReason.HARASSMENT,
    description: 'Reason for the report',
  })
  @IsEnum(ReportReason)
  reason: ReportReason;

  @ApiPropertyOptional({
    example: 'Inappropriate language used during voice chat session.',
    description: 'Detailed description of the issue',
  })
  @IsString()
  @IsOptional()
  description?: string;
}
