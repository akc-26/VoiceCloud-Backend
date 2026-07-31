import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, IsBoolean } from 'class-validator';

export class RestoreBackupDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @IsString()
  backupId: string;

  @ApiPropertyOptional({
    example: ['database', 'redis', 'storage', 'config', 'ssl'],
    description: 'Specific components to restore, or empty for all',
  })
  @IsOptional()
  @IsArray()
  targetComponents?: string[];

  @ApiPropertyOptional({
    example: true,
    description: 'Automatically rollback if restore step fails',
  })
  @IsOptional()
  @IsBoolean()
  autoRollback?: boolean;
}
