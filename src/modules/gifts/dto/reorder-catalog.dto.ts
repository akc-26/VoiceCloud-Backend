import { IsArray, ValidateNested, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class GiftOrderItem {
  @ApiProperty({ description: 'Gift ID' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'New sort order', example: 1 })
  @IsNumber()
  sortOrder: number;
}

export class ReorderCatalogDto {
  @ApiProperty({ type: [GiftOrderItem], description: 'List of gift IDs with updated sort orders' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GiftOrderItem)
  items: GiftOrderItem[];
}
