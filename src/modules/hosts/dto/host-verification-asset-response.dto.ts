import { ApiProperty } from '@nestjs/swagger';
import { PrivateDocumentCategory } from '../../storage/enums/private-document-category.enum';
import { PrivateAssetValidationStatus } from '../../storage/enums/private-asset.enum';

export class HostVerificationAssetResponseDto {
  @ApiProperty({ format: 'uuid' })
  assetId: string;

  @ApiProperty({ enum: PrivateDocumentCategory })
  category: PrivateDocumentCategory;

  @ApiProperty({ example: 'identity-card.pdf' })
  originalFilename: string;

  @ApiProperty({ example: 'application/pdf' })
  verifiedMimeType: string;

  @ApiProperty({ example: 'PDF' })
  verifiedFormat: string;

  @ApiProperty({ example: 245760 })
  fileSize: number;

  @ApiProperty({ enum: PrivateAssetValidationStatus })
  validationStatus: PrivateAssetValidationStatus;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;
}
