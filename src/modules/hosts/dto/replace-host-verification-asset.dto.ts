import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class ReplaceHostVerificationAssetDto {
  @ApiProperty({
    format: 'uuid',
    description:
      'New validated private asset ID that will replace the current asset',
  })
  @IsUUID('4')
  replacementAssetId: string;
}
