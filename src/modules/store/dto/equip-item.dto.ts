import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class EquipStoreItemDto {
  @ApiProperty({ description: 'User Inventory ID to equip' })
  @IsString()
  inventoryId: string;
}

export class UnequipStoreItemDto {
  @ApiProperty({ description: 'User Inventory ID to unequip' })
  @IsString()
  inventoryId: string;
}
