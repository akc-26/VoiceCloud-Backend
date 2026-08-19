import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import * as path from 'path';
import { IsNull, Repository } from 'typeorm';
import { StorageService } from '../storage/storage.service';
import { PrivateDocumentCategory } from '../storage/enums/private-document-category.enum';
import {
  PrivateAssetValidationStatus,
  PrivateAssetVisibility,
} from '../storage/enums/private-asset.enum';
import { HostProfile } from './entities/host-profile.entity';
import { HostVerificationAsset } from './entities/host-verification-asset.entity';
import {
  HostVerificationLegacyMigration,
  LegacyHostAssetMigrationStatus,
} from './entities/host-verification-legacy-migration.entity';
import {
  sanitizePrivateDocumentFilename,
  validateHostVerificationFile,
} from './utils/host-verification-file.util';

type LegacyHostField = 'documentUrl' | 'selfieUrl';

interface LegacyCandidate {
  host: HostProfile;
  field: LegacyHostField;
  category: PrivateDocumentCategory;
  reference: string;
}

export interface LegacyHostMigrationSummary {
  mode: 'PREVIEW' | 'EXECUTE' | 'REPORT';
  candidates: number;
  migrated: number;
  requiresReupload: number;
  recordedMigrations: number;
  recordedFailures: number;
  items: Array<{
    hostProfileId: string;
    category: PrivateDocumentCategory;
    status: LegacyHostAssetMigrationStatus;
    assetId: string | null;
    sourceFilename: string;
    failureCode: string | null;
    publicSourceRetired: boolean;
  }>;
}

const MAX_SIZE_CONFIG: Record<
  PrivateDocumentCategory.GOVERNMENT_ID | PrivateDocumentCategory.SELFIE,
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
};

@Injectable()
export class LegacyHostVerificationMigrationService {
  private readonly logger = new Logger(
    LegacyHostVerificationMigrationService.name,
  );

  constructor(
    @InjectRepository(HostProfile)
    private readonly hostRepository: Repository<HostProfile>,
    @InjectRepository(HostVerificationAsset)
    private readonly assetRepository: Repository<HostVerificationAsset>,
    @InjectRepository(HostVerificationLegacyMigration)
    private readonly migrationRepository: Repository<HostVerificationLegacyMigration>,
    private readonly storageService: StorageService,
    private readonly configService: ConfigService,
  ) {}

  async preview(): Promise<LegacyHostMigrationSummary> {
    const candidates = await this.findCandidates();
    return {
      ...(await this.recordedSummary('PREVIEW')),
      candidates: candidates.length,
    };
  }

  async report(): Promise<LegacyHostMigrationSummary> {
    const candidates = await this.findCandidates();
    return {
      ...(await this.recordedSummary('REPORT')),
      candidates: candidates.length,
    };
  }

  async execute(): Promise<LegacyHostMigrationSummary> {
    const candidates = await this.findCandidates();
    let migrated = 0;
    let requiresReupload = 0;

    for (const candidate of candidates) {
      const status = await this.migrateCandidate(candidate);
      if (status === LegacyHostAssetMigrationStatus.MIGRATED) {
        migrated += 1;
      } else {
        requiresReupload += 1;
      }
    }

    const recorded = await this.recordedSummary('EXECUTE');
    return {
      ...recorded,
      candidates: candidates.length,
      migrated,
      requiresReupload,
    };
  }

  private async findCandidates(): Promise<LegacyCandidate[]> {
    const hosts = await this.hostRepository.find();
    const candidates: LegacyCandidate[] = [];

    for (const host of hosts) {
      if (host.documentUrl?.trim()) {
        candidates.push({
          host,
          field: 'documentUrl',
          category: PrivateDocumentCategory.GOVERNMENT_ID,
          reference: host.documentUrl.trim(),
        });
      }
      if (host.selfieUrl?.trim()) {
        candidates.push({
          host,
          field: 'selfieUrl',
          category: PrivateDocumentCategory.SELFIE,
          reference: host.selfieUrl.trim(),
        });
      }
    }
    return candidates;
  }

  private async migrateCandidate(
    candidate: LegacyCandidate,
  ): Promise<LegacyHostAssetMigrationStatus> {
    const sourceFingerprint = crypto
      .createHash('sha256')
      .update(candidate.reference)
      .digest('hex');
    const sourceFilename = this.safeSourceFilename(candidate.reference);
    const quarantineKey = this.generateQuarantineKey(
      candidate.category,
      sourceFilename,
    );
    let stage = 'READ_SOURCE';
    let finalStorageKey: string | null = null;
    let finalPrivateWritten = false;

    try {
      const source = await this.storageService.readLegacyPublicObject(
        candidate.reference,
      );

      stage = 'QUARANTINE_SOURCE';
      await this.storageService.quarantineLegacyPublicObject(
        candidate.reference,
        quarantineKey,
      );

      stage = 'VALIDATE_SOURCE';
      const limit = MAX_SIZE_CONFIG[candidate.category];
      const maxSize = this.configService.get<number>(
        limit.key,
        limit.defaultValue,
      );
      const validated = validateHostVerificationFile(
        {
          buffer: source.buffer,
          originalname: source.originalFilename,
          mimetype: source.mimeType,
          size: source.size,
        } as Express.Multer.File,
        candidate.category,
        maxSize,
      );

      let asset = await this.findCurrentAsset(candidate);
      if (!asset) {
        stage = 'WRITE_PRIVATE';
        finalStorageKey = this.storageService.generatePrivateStorageKey(
          candidate.host.userId,
          candidate.category,
          validated.extension,
        );
        const storageProvider = await this.storageService.writePrivateObject(
          finalStorageKey,
          source.buffer,
          validated.verifiedMimeType,
        );
        finalPrivateWritten = true;
        asset = this.assetRepository.create({
          ownerUserId: candidate.host.userId,
          hostProfileId: candidate.host.id,
          category: candidate.category,
          originalFilename: validated.originalFilename,
          storageKey: finalStorageKey,
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
      }

      stage = 'PERSIST_METADATA';
      await this.assetRepository.manager.transaction(async (manager) => {
        const hostRepository = manager.getRepository(HostProfile);
        const assetRepository = manager.getRepository(HostVerificationAsset);
        const migrationRepository = manager.getRepository(
          HostVerificationLegacyMigration,
        );
        const lockedHost = await hostRepository.findOne({
          where: { id: candidate.host.id },
          lock: { mode: 'pessimistic_write' },
        });
        if (
          !lockedHost ||
          lockedHost[candidate.field]?.trim() !== candidate.reference
        ) {
          throw new Error('Legacy Host reference changed during migration');
        }

        const savedAsset = asset.id ? asset : await assetRepository.save(asset);
        lockedHost[candidate.field] = '';
        await hostRepository.save(lockedHost);

        const existing = await migrationRepository.findOne({
          where: {
            hostProfileId: candidate.host.id,
            category: candidate.category,
          },
        });
        const record = existing || migrationRepository.create();
        Object.assign(record, {
          hostProfileId: candidate.host.id,
          ownerUserId: candidate.host.userId,
          category: candidate.category,
          sourceFingerprint,
          sourceFilename: validated.originalFilename,
          quarantineStorageKey: quarantineKey,
          status: LegacyHostAssetMigrationStatus.MIGRATED,
          assetId: savedAsset.id,
          failureCode: null,
          failureDetail: null,
          publicSourceRetiredAt: new Date(),
        });
        await migrationRepository.save(record);
      });

      this.logger.log(
        `Migrated legacy ${candidate.category} for Host ${candidate.host.id}`,
      );
      return LegacyHostAssetMigrationStatus.MIGRATED;
    } catch (error) {
      if (finalPrivateWritten && finalStorageKey) {
        try {
          await this.storageService.deletePrivateObject(finalStorageKey);
        } catch {
          this.logger.error(
            `Could not compensate final private object for Host ${candidate.host.id}`,
          );
        }
      }
      const failure = this.failureFor(stage, error);
      await this.recordFailure(
        candidate,
        sourceFingerprint,
        sourceFilename,
        stage === 'READ_SOURCE' ? null : quarantineKey,
        failure.code,
        failure.detail,
      );
      this.logger.warn(
        `Legacy ${candidate.category} for Host ${candidate.host.id} requires re-upload (${failure.code})`,
      );
      return LegacyHostAssetMigrationStatus.REQUIRES_REUPLOAD;
    }
  }

  private findCurrentAsset(
    candidate: LegacyCandidate,
  ): Promise<HostVerificationAsset | null> {
    return this.assetRepository.findOne({
      where: {
        ownerUserId: candidate.host.userId,
        hostProfileId: candidate.host.id,
        category: candidate.category,
        visibility: PrivateAssetVisibility.PRIVATE,
        validationStatus: PrivateAssetValidationStatus.VALIDATED,
        isActive: true,
        retiredAt: IsNull(),
        replacedByAssetId: IsNull(),
      },
    });
  }

  private async recordFailure(
    candidate: LegacyCandidate,
    sourceFingerprint: string,
    sourceFilename: string,
    quarantineStorageKey: string | null,
    failureCode: string,
    failureDetail: string,
  ): Promise<void> {
    const existing = await this.migrationRepository.findOne({
      where: {
        hostProfileId: candidate.host.id,
        category: candidate.category,
      },
    });
    const record = existing || this.migrationRepository.create();
    Object.assign(record, {
      hostProfileId: candidate.host.id,
      ownerUserId: candidate.host.userId,
      category: candidate.category,
      sourceFingerprint,
      sourceFilename,
      quarantineStorageKey,
      status: LegacyHostAssetMigrationStatus.REQUIRES_REUPLOAD,
      assetId: null,
      failureCode,
      failureDetail,
      publicSourceRetiredAt: quarantineStorageKey ? new Date() : null,
    });
    await this.migrationRepository.save(record);
  }

  private async recordedSummary(
    mode: LegacyHostMigrationSummary['mode'],
  ): Promise<LegacyHostMigrationSummary> {
    const records = await this.migrationRepository.find();
    return {
      mode,
      candidates: 0,
      migrated: 0,
      requiresReupload: 0,
      recordedMigrations: records.filter(
        (record) => record.status === LegacyHostAssetMigrationStatus.MIGRATED,
      ).length,
      recordedFailures: records.filter(
        (record) =>
          record.status === LegacyHostAssetMigrationStatus.REQUIRES_REUPLOAD,
      ).length,
      items: records.map((record) => ({
        hostProfileId: record.hostProfileId,
        category: record.category,
        status: record.status,
        assetId: record.assetId,
        sourceFilename: record.sourceFilename,
        failureCode: record.failureCode,
        publicSourceRetired: record.publicSourceRetiredAt !== null,
      })),
    };
  }

  private safeSourceFilename(reference: string): string {
    try {
      const pathname = /^https?:\/\//i.test(reference)
        ? new URL(reference).pathname
        : reference.split(/[?#]/, 1)[0];
      return sanitizePrivateDocumentFilename(
        path.basename(decodeURIComponent(pathname)),
      );
    } catch {
      return 'legacy-document.bin';
    }
  }

  private generateQuarantineKey(
    category: PrivateDocumentCategory,
    filename: string,
  ): string {
    const extension = path.extname(filename).toLowerCase();
    return `legacy-host-verification-quarantine/${category}/${crypto.randomUUID()}${extension}`;
  }

  private failureFor(
    stage: string,
    error: unknown,
  ): { code: string; detail: string } {
    const message = error instanceof Error ? error.message : '';
    if (stage === 'READ_SOURCE') {
      if (message.toLowerCase().includes('not found')) {
        return {
          code: 'SOURCE_NOT_FOUND',
          detail:
            'Legacy source was not available; secure re-upload is required.',
        };
      }
      return {
        code: 'UNSUPPORTED_SOURCE',
        detail: 'Legacy source is not an approved local /uploads object.',
      };
    }
    if (stage === 'QUARANTINE_SOURCE') {
      return {
        code: 'QUARANTINE_FAILED',
        detail: 'Legacy source could not be retired from public storage.',
      };
    }
    if (stage === 'VALIDATE_SOURCE') {
      return {
        code: 'VALIDATION_FAILED',
        detail:
          'Legacy source failed private document validation; secure re-upload is required.',
      };
    }
    if (stage === 'WRITE_PRIVATE') {
      return {
        code: 'PRIVATE_STORAGE_FAILED',
        detail:
          'Private storage write failed; secure re-upload or Admin review is required.',
      };
    }
    return {
      code: 'METADATA_PERSISTENCE_FAILED',
      detail:
        'Migration metadata could not be persisted; Admin review is required.',
    };
  }
}
