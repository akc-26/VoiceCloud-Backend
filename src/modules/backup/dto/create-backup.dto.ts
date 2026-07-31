import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsArray,
  IsBoolean,
  IsNumber,
} from 'class-validator';
import { BackupType } from '../entities/backup-record.entity';

export class CreateBackupDto {
  @ApiPropertyOptional({ example: 'VoiceCloud_Manual_Backup_2026' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: BackupType, default: BackupType.MANUAL })
  @IsOptional()
  @IsEnum(BackupType)
  type?: BackupType;

  @ApiPropertyOptional({
    example: ['database', 'redis', 'storage', 'config', 'ssl'],
    description: 'Components to include in backup package',
  })
  @IsOptional()
  @IsArray()
  components?: string[];

  @ApiPropertyOptional({
    example: 'local',
    description: 'Target storage: local, usb, nas, s3',
  })
  @IsOptional()
  @IsString()
  storageLocation?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isEncrypted?: boolean;

  @ApiPropertyOptional({ example: 'Pre-upgrade system safety snapshot' })
  @IsOptional()
  @IsString()
  notes?: string;
}
