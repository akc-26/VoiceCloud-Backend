import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ApproveReportDto {
  @ApiPropertyOptional({
    example: 'Report validated. User received temporary suspension.',
    description: 'Resolution notes by administrator',
  })
  @IsString()
  @IsOptional()
  resolutionNotes?: string;
}

export class DismissReportDto {
  @ApiPropertyOptional({
    example: 'Insufficient evidence provided.',
    description: 'Dismissal reason / resolution notes',
  })
  @IsString()
  @IsOptional()
  resolutionNotes?: string;
}
