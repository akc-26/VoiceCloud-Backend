import { IsUUID, IsString, IsOptional, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BlockUserDto {
  @ApiProperty({
    example: '22222222-2222-2222-2222-222222222222',
    description: 'Target User ID to block',
  })
  @IsUUID()
  @IsNotEmpty()
  targetUserId: string;

  @ApiPropertyOptional({
    example: 'Sending unwanted promotional links',
    description: 'Reason for blocking',
  })
  @IsString()
  @IsOptional()
  reason?: string;
}
