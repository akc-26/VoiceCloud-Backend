import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsBoolean, IsOptional } from 'class-validator';

export class PurchaseVipDto {
  @ApiProperty({ example: '11111111-2222-3333-4444-555555555555' })
  @IsUUID()
  planId: string;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean;
}
