import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class TransferAgencyOwnershipDto {
  @ApiProperty({ example: 'user-uuid-new-owner' })
  @IsString()
  @IsNotEmpty()
  newOwnerId: string;
}
