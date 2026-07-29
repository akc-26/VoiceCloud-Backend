import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class SubscribeCreatorDto {
  @ApiProperty({
    description: 'Creator plan UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  planId: string;

  @ApiPropertyOptional({ description: 'Auto-renew indicator', default: true })
  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean = true;
}
