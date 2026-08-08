import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Not, Repository } from 'typeorm';
import { StorageService } from '../storage/storage.service';
import { PrivateDocumentCategory } from '../storage/enums/private-document-category.enum';
import {
  PrivateAssetValidationStatus,
  PrivateAssetVisibility,
} from '../storage/enums/private-asset.enum';
import { HostVerificationAssetResponseDto } from './dto/host-verification-asset-response.dto';
import { HostVerificationAsset } from './entities/host-verification-asset.entity';
import { validateHostVerificationFile } from './utils/host-verification-file.util';
import { UserRole } from '../../common/enums';

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

export interface HostApplicationAssetSelection {
  governmentIdAssetId?: string;
  selfieAssetId?: string;
  supportingDocumentAssetIds?: string[];
}

export interface HostVerificationAssetActor {
  userId: string;
  role?: string;
  roles?: string[];
}

export interface HostVerificationAssetContent {
  asset: HostVerificationAsset;
  buffer: Buffer;
}

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

  async validateApplicationAssets(
    ownerUserId: string,
    selection: HostApplicationAssetSelection,
    targetHostProfileId?: string,
  ): Promise<HostVerificationAsset[]> {
    const categorizedIds = this.getCategorizedAssetIds(selection);
    const allIds = categorizedIds.map(({ id }) => id);

    if (allIds.length === 0) {
      throw new BadRequestException(
        'At least one private Host verification asset ID is required',
      );
    }
    if (new Set(allIds).size !== allIds.length) {
      throw new BadRequestException(
        'Duplicate Host verification asset IDs are not allowed',
      );
    }

    const assets = await this.assetRepository.find({
      where: { id: In(allIds) },
    });
    const assetsById = new Map(assets.map((asset) => [asset.id, asset]));

    for (const expected of categorizedIds) {
      const asset = assetsById.get(expected.id);
      if (!asset) {
        throw new NotFoundException(
          `Host verification asset ${expected.id} was not found`,
        );
      }
      if (asset.ownerUserId !== ownerUserId) {
        throw new ForbiddenException(
          'Host verification assets can only be linked by their owner',
        );
      }
      if (asset.category !== expected.category) {
        throw new BadRequestException(
          `Asset ${expected.id} is not valid for ${expected.category}`,
        );
      }
      if (asset.visibility !== PrivateAssetVisibility.PRIVATE) {
        throw new BadRequestException(
          'Only PRIVATE Host verification assets can be linked',
        );
      }
      if (asset.validationStatus !== PrivateAssetValidationStatus.VALIDATED) {
        throw new BadRequestException(
          'Only validated Host verification assets can be linked',
        );
      }
      if (
        !asset.isActive ||
        asset.retiredAt !== null ||
        asset.replacedByAssetId !== null
      ) {
        throw new BadRequestException(
          'Inactive, retired, or replaced Host verification assets cannot be linked',
        );
      }
      if (asset.hostProfileId && asset.hostProfileId !== targetHostProfileId) {
        throw new ConflictException(
          'Host verification asset is already linked to another application',
        );
      }
    }

    return categorizedIds.map(({ id }) => {
      const asset = assetsById.get(id);
      if (!asset) {
        throw new NotFoundException(
          `Host verification asset ${id} was not found`,
        );
      }
      return asset;
    });
  }

  async linkApplicationAssets(
    ownerUserId: string,
    hostProfileId: string,
    selection: HostApplicationAssetSelection,
  ): Promise<HostVerificationAsset[]> {
    const selectedAssets = await this.validateApplicationAssets(
      ownerUserId,
      selection,
      hostProfileId,
    );
    const existingAssets = await this.getActiveLinkedAssets(
      ownerUserId,
      hostProfileId,
    );

    for (const category of [
      PrivateDocumentCategory.GOVERNMENT_ID,
      PrivateDocumentCategory.SELFIE,
    ]) {
      const selected = selectedAssets.find(
        (asset) => asset.category === category,
      );
      const current = existingAssets.find(
        (asset) => asset.category === category,
      );
      if (selected && current && selected.id !== current.id) {
        throw new ConflictException(
          `${category} replacement must use the controlled replacement workflow`,
        );
      }
    }

    for (const asset of selectedAssets) {
      asset.hostProfileId = hostProfileId;
    }
    await this.assetRepository.save(selectedAssets);

    const combined = new Map(
      [...existingAssets, ...selectedAssets].map((asset) => [asset.id, asset]),
    );
    return [...combined.values()];
  }

  async getActiveLinkedAssets(
    ownerUserId: string,
    hostProfileId: string,
  ): Promise<HostVerificationAsset[]> {
    return this.assetRepository.find({
      where: {
        ownerUserId,
        hostProfileId,
        visibility: PrivateAssetVisibility.PRIVATE,
        validationStatus: PrivateAssetValidationStatus.VALIDATED,
        isActive: true,
        retiredAt: IsNull(),
        replacedByAssetId: IsNull(),
      },
      order: { createdAt: 'ASC' },
    });
  }

  async listOwnerAssets(
    ownerUserId: string,
  ): Promise<HostVerificationAssetResponseDto[]> {
    const assets = await this.assetRepository.find({
      where: {
        ownerUserId,
        visibility: PrivateAssetVisibility.PRIVATE,
        validationStatus: PrivateAssetValidationStatus.VALIDATED,
        isActive: true,
        retiredAt: IsNull(),
        replacedByAssetId: IsNull(),
      },
      order: { category: 'ASC', createdAt: 'ASC' },
    });
    return assets.map((asset) => this.toSafeResponse(asset));
  }

  async listHostAssetsForAdmin(
    hostProfileId: string,
  ): Promise<HostVerificationAssetResponseDto[]> {
    const assets = await this.assetRepository.find({
      where: {
        hostProfileId,
        visibility: PrivateAssetVisibility.PRIVATE,
        validationStatus: PrivateAssetValidationStatus.VALIDATED,
        isActive: true,
        retiredAt: IsNull(),
        replacedByAssetId: IsNull(),
      },
      order: { category: 'ASC', createdAt: 'ASC' },
    });
    return assets.map((asset) => this.toSafeResponse(asset));
  }

  async getAuthorizedContent(
    assetId: string,
    actor: HostVerificationAssetActor,
  ): Promise<HostVerificationAssetContent> {
    const asset = await this.assetRepository.findOne({
      where: { id: assetId },
    });
    if (!asset) {
      throw new NotFoundException('Host verification asset was not found');
    }

    const roles = new Set([actor.role, ...(actor.roles || [])].filter(Boolean));
    const isAdministrator =
      roles.has(UserRole.ADMIN) || roles.has(UserRole.SUPER_ADMIN);
    const isOwner = asset.ownerUserId === actor.userId;

    if (!isOwner && !isAdministrator) {
      throw new ForbiddenException(
        'Host verification asset access is restricted to its owner and administrators',
      );
    }
    if (isAdministrator && !isOwner && !asset.hostProfileId) {
      throw new ForbiddenException(
        'Administrators can only access assets linked to a Host application',
      );
    }
    this.assertCurrentPrivateAsset(asset, 'access');

    try {
      const exists = await this.storageService.existsPrivateObject(
        asset.storageKey,
      );
      if (!exists) {
        throw new NotFoundException('Host verification asset was not found');
      }
      const buffer = await this.storageService.readPrivateObject(
        asset.storageKey,
      );
      if (buffer.length !== asset.fileSize) {
        this.logger.error(
          `Private Host verification asset size mismatch for asset ${asset.id}`,
        );
        throw new ServiceUnavailableException(
          'Private Host verification asset content is unavailable',
        );
      }
      return { asset, buffer };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ServiceUnavailableException
      ) {
        throw error;
      }
      this.logger.error(
        `Failed to read private Host verification asset ${asset.id}`,
      );
      throw new ServiceUnavailableException(
        'Private Host verification asset content is unavailable',
      );
    }
  }

  async replaceLinkedAsset(
    ownerUserId: string,
    currentAssetId: string,
    replacementAssetId: string,
  ): Promise<HostVerificationAssetResponseDto> {
    if (currentAssetId === replacementAssetId) {
      throw new BadRequestException(
        'Replacement asset must be different from the current asset',
      );
    }

    return this.assetRepository.manager.transaction(async (manager) => {
      const repository = manager.getRepository(HostVerificationAsset);
      const current = await repository.findOne({
        where: { id: currentAssetId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!current) {
        throw new NotFoundException(
          'Current Host verification asset was not found',
        );
      }
      if (current.ownerUserId !== ownerUserId) {
        throw new ForbiddenException(
          'Only the asset owner can replace a Host verification asset',
        );
      }
      if (!current.hostProfileId) {
        throw new ConflictException(
          'Only assets linked to a Host application can be replaced',
        );
      }
      this.assertCurrentPrivateAsset(current, 'replace');

      const replacement = await repository.findOne({
        where: { id: replacementAssetId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!replacement) {
        throw new NotFoundException(
          'Replacement Host verification asset was not found',
        );
      }
      if (replacement.ownerUserId !== ownerUserId) {
        throw new ForbiddenException(
          'Replacement asset must be owned by the authenticated user',
        );
      }
      if (replacement.category !== current.category) {
        throw new BadRequestException(
          'Replacement asset category must match the current asset category',
        );
      }
      if (replacement.hostProfileId) {
        throw new ConflictException(
          'Replacement asset must not already be linked to an application',
        );
      }
      this.assertCurrentPrivateAsset(replacement, 'use as a replacement');

      if (
        current.category === PrivateDocumentCategory.GOVERNMENT_ID ||
        current.category === PrivateDocumentCategory.SELFIE
      ) {
        const competingCurrent = await repository.findOne({
          where: {
            id: Not(current.id),
            hostProfileId: current.hostProfileId,
            category: current.category,
            visibility: PrivateAssetVisibility.PRIVATE,
            validationStatus: PrivateAssetValidationStatus.VALIDATED,
            isActive: true,
            retiredAt: IsNull(),
            replacedByAssetId: IsNull(),
          },
          lock: { mode: 'pessimistic_write' },
        });
        if (competingCurrent) {
          throw new ConflictException(
            `Another active ${current.category} asset already exists for this Host application`,
          );
        }
      }

      replacement.hostProfileId = current.hostProfileId;
      current.isActive = false;
      current.retiredAt = new Date();
      current.replacedByAssetId = replacement.id;

      await repository.save([replacement, current]);
      return this.toSafeResponse(replacement);
    });
  }

  private assertCurrentPrivateAsset(
    asset: HostVerificationAsset,
    action: string,
  ): void {
    if (
      asset.visibility !== PrivateAssetVisibility.PRIVATE ||
      asset.validationStatus !== PrivateAssetValidationStatus.VALIDATED ||
      !asset.isActive ||
      asset.retiredAt !== null ||
      asset.replacedByAssetId !== null
    ) {
      throw new NotFoundException(
        `Host verification asset is not available to ${action}`,
      );
    }
  }

  private getCategorizedAssetIds(
    selection: HostApplicationAssetSelection,
  ): Array<{ id: string; category: PrivateDocumentCategory }> {
    const categorizedIds: Array<{
      id: string;
      category: PrivateDocumentCategory;
    }> = [];

    if (selection.governmentIdAssetId) {
      categorizedIds.push({
        id: selection.governmentIdAssetId,
        category: PrivateDocumentCategory.GOVERNMENT_ID,
      });
    }
    if (selection.selfieAssetId) {
      categorizedIds.push({
        id: selection.selfieAssetId,
        category: PrivateDocumentCategory.SELFIE,
      });
    }
    for (const id of selection.supportingDocumentAssetIds || []) {
      categorizedIds.push({
        id,
        category: PrivateDocumentCategory.SUPPORTING_DOCUMENT,
      });
    }

    return categorizedIds;
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
      linkedToApplication: asset.hostProfileId !== null,
      createdAt: asset.createdAt,
    };
  }
}
