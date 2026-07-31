import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional } from 'class-validator';

export class GrantInventoryItemDto {
  @ApiProperty({ description: 'Target User ID' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Store Item ID to grant' })
  @IsString()
  itemId: string;

  @ApiPropertyOptional({
    description: 'Grant duration in days (-1 for permanent)',
    example: 30,
  })
  @IsOptional()
  @IsNumber()
  durationDays?: number = 30;

  @ApiPropertyOptional({ description: 'Admin note or reason' })
  @IsOptional()
  @IsString()
  reason?: string;
}
