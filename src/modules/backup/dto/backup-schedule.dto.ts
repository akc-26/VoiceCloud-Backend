import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsArray,
  IsBoolean,
  IsNumber,
} from 'class-validator';
import { ScheduleFrequency } from '../entities/backup-schedule.entity';
import { BackupType } from '../entities/backup-record.entity';

export class CreateScheduleDto {
  @ApiProperty({ example: 'Nightly Full Database & Config Backup' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ enum: BackupType, default: BackupType.FULL })
  @IsOptional()
  @IsEnum(BackupType)
  type?: BackupType;

  @ApiProperty({ enum: ScheduleFrequency, default: ScheduleFrequency.DAILY })
  @IsEnum(ScheduleFrequency)
  frequency: ScheduleFrequency;

  @ApiPropertyOptional({
    example: '0 2 * * *',
    description: 'Cron expression for custom schedule',
  })
  @IsOptional()
  @IsString()
  cronExpression?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @ApiPropertyOptional({
    example: ['database', 'redis', 'storage', 'config', 'ssl'],
  })
  @IsOptional()
  @IsArray()
  components?: string[];

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @IsNumber()
  retentionDays?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  maxBackupCount?: number;

  @ApiPropertyOptional({ example: 'local' })
  @IsOptional()
  @IsString()
  targetStorage?: string;
}

export class UpdateScheduleDto extends CreateScheduleDto {}
