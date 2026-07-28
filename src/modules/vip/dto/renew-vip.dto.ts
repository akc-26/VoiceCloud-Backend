import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsOptional } from 'class-validator';

export class RenewVipDto {
  @ApiPropertyOptional({ example: '11111111-2222-3333-4444-555555555555' })
  @IsOptional()
  @IsUUID()
  planId?: string;
}
