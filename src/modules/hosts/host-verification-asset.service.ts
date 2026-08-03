import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StorageService } from '../storage/storage.service';
import { PrivateDocumentCategory } from '../storage/enums/private-document-category.enum';
import {
  PrivateAssetValidationStatus,
  PrivateAssetVisibility,
} from '../storage/enums/private-asset.enum';
import { HostVerificationAssetResponseDto } from './dto/host-verification-asset-response.dto';
import { HostVerificationAsset } from './entities/host-verification-asset.entity';
import { validateHostVerificationFile } from './utils/host-verification-file.util';

const MAX_SIZE_CONFIG: Record<
  PrivateDocumentCategory,
  { key: string; defaultValue: number }
> = {
  [PrivateDocumentCategory.GOVERNMENT_ID]: {
    key: 'storage.hostGovernmentIdMaxSize',
    defaultValue: 10 * 1024 * 1024,
  },
  [PrivateDocumentCategory.SELFIE]: {
    key: 'storage.hostSelfieMaxSize',
    defaultValue: 5 * 1024 * 1024,
  },
  [PrivateDocumentCategory.SUPPORTING_DOCUMENT]: {
    key: 'storage.hostSupportingDocumentMaxSize',
    defaultValue: 20 * 1024 * 1024,
  },
};

@Injectable()
export class HostVerificationAssetService {
  private readonly logger = new Logger(HostVerificationAssetService.name);

  constructor(
    @InjectRepository(HostVerificationAsset)
    private readonly assetRepository: Repository<HostVerificationAsset>,
    private readonly storageService: StorageService,
    private readonly configService: ConfigService,
  ) {}

  async uploadValidatedAsset(
    ownerUserId: string,
    category: PrivateDocumentCategory,
    file: Express.Multer.File,
  ): Promise<HostVerificationAssetResponseDto> {
    if (!ownerUserId) {
      throw new Error('Authenticated owner user ID is required');
    }

    const limitConfig = MAX_SIZE_CONFIG[category];
    if (!limitConfig) {
      throw new Error(`Unsupported private document category: ${category}`);
    }
    const maxSize = this.configService.get<number>(
      limitConfig.key,
      limitConfig.defaultValue,
    );
    const validated = validateHostVerificationFile(file, category, maxSize);
    const storageKey = this.storageService.generatePrivateStorageKey(
      ownerUserId,
      category,
      validated.extension,
    );

    let privateObjectWritten = false;
    try {
      const storageProvider = await this.storageService.writePrivateObject(
        storageKey,
        file.buffer,
        validated.verifiedMimeType,
      );
      privateObjectWritten = true;

      const asset = this.assetRepository.create({
        ownerUserId,
        hostProfileId: null,
        category,
        originalFilename: validated.originalFilename,
        storageKey,
        verifiedMimeType: validated.verifiedMimeType,
        verifiedFormat: validated.verifiedFormat,
        fileSize: validated.fileSize,
        storageProvider,
        visibility: PrivateAssetVisibility.PRIVATE,
        validationStatus: PrivateAssetValidationStatus.VALIDATED,
        isActive: true,
        retiredAt: null,
        replacedByAssetId: null,
      });
      const saved = await this.assetRepository.save(asset);

      return this.toSafeResponse(saved);
    } catch (error) {
      if (privateObjectWritten) {
        try {
          await this.storageService.deletePrivateObject(storageKey);
        } catch {
          this.logger.error(
            'Failed to compensate private object after metadata persistence failure',
          );
        }
      }
      throw error;
    }
  }

  private toSafeResponse(
    asset: HostVerificationAsset,
  ): HostVerificationAssetResponseDto {
    return {
      assetId: asset.id,
      category: asset.category,
      originalFilename: asset.originalFilename,
      verifiedMimeType: asset.verifiedMimeType,
      verifiedFormat: asset.verifiedFormat,
      fileSize: asset.fileSize,
      validationStatus: asset.validationStatus,
      isActive: asset.isActive,
      createdAt: asset.createdAt,
    };
  }
}
