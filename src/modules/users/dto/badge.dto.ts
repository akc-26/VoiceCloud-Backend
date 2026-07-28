import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ManageBadgeDto {
  @ApiProperty({ example: 'Top-Giver-2026', description: 'Badge identifier or name' })
  @IsString()
  @IsNotEmpty()
  badge: string;
}
