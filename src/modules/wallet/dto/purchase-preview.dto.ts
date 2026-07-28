import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsNotEmpty } from 'class-validator';

export class PurchasePreviewDto {
  @ApiProperty({ description: 'Coin package UUID to preview purchase', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  @IsNotEmpty()
  packageId: string;
}
