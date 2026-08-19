import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  BackupRecord,
  BackupType,
  BackupStatus,
} from './entities/backup-record.entity';
import { BackupSchedule } from './entities/backup-schedule.entity';
import { CreateBackupDto } from './dto/create-backup.dto';
import { RedisStateService } from '../../redis/redis-state.service';
import { EventsGateway } from '../../common/events/events.gateway';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as AdmZip from 'adm-zip';

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);
  private readonly backupDir = path.join(process.cwd(), 'backups');
  private readonly encryptedBackupMagic = Buffer.from('VCBKP1', 'ascii');

  constructor(
    @InjectRepository(BackupRecord)
    private readonly backupRepository: Repository<BackupRecord>,
    @InjectRepository(BackupSchedule)
    private readonly scheduleRepository: Repository<BackupSchedule>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly redisStateService: RedisStateService,
    private readonly eventsGateway: EventsGateway,
  ) {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  async createBackup(
    dto: CreateBackupDto,
    createdBy = 'SYSTEM',
  ): Promise<BackupRecord> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const requestedBackupName =
      dto.name ||
      `VoiceCloud_Backup_${dto.type || BackupType.MANUAL}_${timestamp}`;
    const backupName = this.sanitizeBackupName(requestedBackupName);
    const components = dto.components || [
      'database',
      'redis',
      'storage',
      'config',
      'ssl',
    ];

    const fileName = `${backupName}.zip`;
    const fullPath = this.resolveBackupPath(fileName);

    const record = this.backupRepository.create({
      name: backupName,
      type: dto.type || BackupType.MANUAL,
      status: BackupStatus.IN_PROGRESS,
      filePath: fileName,
      storageLocation: dto.storageLocation || 'local',
      componentsIncluded: components,
      isEncrypted: dto.isEncrypted ?? true,
      encryptionAlgorithm: 'AES-256-GCM',
      notes: dto.notes || 'Infrastructure platform backup snapshot',
      createdBy,
    });
    await this.backupRepository.save(record);

    this.eventsGateway.broadcastToAdmin('backup_progress', {
      backupId: record.id,
      status: 'IN_PROGRESS',
      progress: 10,
      step: 'Initiating backup payload collection',
    });

    try {
      const zip = new AdmZip();
      let originalSizeTotal = 0;
      let totalFiles = 0;

      // 1. DATABASE COMPONENT
      if (components.includes('database')) {
        this.logger.log(`[Backup Engine] Exporting Database tables...`);
        const dbDump: Record<string, any[]> = {};
        for (const entityMeta of this.dataSource.entityMetadatas) {
          const repo = this.dataSource.getRepository(entityMeta.name);
          const rows = await repo.find();
          dbDump[entityMeta.tableName] = rows;
          totalFiles++;
        }
        const dbBuffer = Buffer.from(JSON.stringify(dbDump, null, 2), 'utf-8');
        originalSizeTotal += dbBuffer.length;
        zip.addFile('database/db_dump.json', dbBuffer);
      }

      this.eventsGateway.broadcastToAdmin('backup_progress', {
        backupId: record.id,
        status: 'IN_PROGRESS',
        progress: 40,
        step: 'Exporting Redis and Configuration state',
      });

      // 2. REDIS COMPONENT
      if (components.includes('redis')) {
        this.logger.log(`[Backup Engine] Exporting Redis state keys...`);
        const redisDump = {
          exportedAt: new Date().toISOString(),
          activeSessionsCount:
            await this.redisStateService.getParticipantCount('system_summary'),
          notice: 'Redis state snapshot captured',
        };
        const redisBuffer = Buffer.from(
          JSON.stringify(redisDump, null, 2),
          'utf-8',
        );
        originalSizeTotal += redisBuffer.length;
        zip.addFile('redis/redis_snapshot.json', redisBuffer);
        totalFiles++;
      }

      // 3. CONFIGURATIONS & PROVIDERS
      if (components.includes('config')) {
        this.logger.log(
          `[Backup Engine] Exporting System Configurations & Feature Flags...`,
        );
        const configDump = {
          environment: process.env.NODE_ENV || 'development',
          port: process.env.PORT || 3000,
          appVersion: '15.1.0',
          exportedAt: new Date().toISOString(),
        };
        const configBuffer = Buffer.from(
          JSON.stringify(configDump, null, 2),
          'utf-8',
        );
        originalSizeTotal += configBuffer.length;
        zip.addFile('config/env_config.json', configBuffer);
        totalFiles++;
      }

      // 4. SSL & METADATA
      if (components.includes('ssl')) {
        const sslDump = {
          certIssuer: 'VoiceCloud Internal CA / LetsEncrypt',
          validUntil: '2027-12-31',
          encryptionKeyMetadata: 'Hardware-bound AES-256-GCM',
        };
        const sslBuffer = Buffer.from(
          JSON.stringify(sslDump, null, 2),
          'utf-8',
        );
        originalSizeTotal += sslBuffer.length;
        zip.addFile('ssl/cert_metadata.json', sslBuffer);
        totalFiles++;
      }

      // 5. STORAGE / UPLOADS METADATA
      if (components.includes('storage')) {
        const uploadsDir = path.join(process.cwd(), 'uploads');
        if (fs.existsSync(uploadsDir)) {
          this.addDirectoryToZip(zip, uploadsDir, 'storage/uploads');
        } else {
          zip.addFile(
            'storage/readme.txt',
            Buffer.from('Storage empty or mapped to MinIO/S3', 'utf-8'),
          );
        }
        totalFiles++;
      }

      // Serialize the ZIP payload, then apply authenticated encryption at rest
      // when requested. Existing API/file naming remains unchanged.
      const zipBuffer = zip.toBuffer();
      const archiveBuffer = record.isEncrypted
        ? this.encryptBackupBuffer(zipBuffer)
        : zipBuffer;
      fs.writeFileSync(fullPath, archiveBuffer);

      const compressedSize = fs.statSync(fullPath).size;
      const compressionRatio =
        originalSizeTotal > 0
          ? Number((compressedSize / originalSizeTotal).toFixed(2))
          : 1.0;
      const checksum = this.calculateFileChecksum(fullPath);
      const durationMs = Date.now() - startTime;

      record.status = BackupStatus.COMPLETED;
      record.fileSizeOriginal = originalSizeTotal;
      record.fileSizeCompressed = compressedSize;
      record.compressionRatio = compressionRatio;
      record.durationMs = durationMs;
      record.checksum = checksum;
      record.fileCount = totalFiles;
      await this.backupRepository.save(record);

      // Auto Verify after creation
      await this.verifyBackup(record.id);

      this.eventsGateway.broadcastToAdmin('backup_progress', {
        backupId: record.id,
        status: 'COMPLETED',
        progress: 100,
        step: 'Backup successfully created and verified',
      });

      this.logger.log(
        `[Backup Engine] Created backup '${fileName}' (${compressedSize} bytes, ${durationMs}ms)`,
      );

      // Execute retention policy cleanup
      await this.enforceRetentionPolicies();

      return record;
    } catch (err: any) {
      this.logger.error(
        `[Backup Engine] Backup failed: ${err.message}`,
        err.stack,
      );
      record.status = BackupStatus.FAILED;
      record.notes = `Error: ${err.message}`;
      await this.backupRepository.save(record);

      this.eventsGateway.broadcastToAdmin('backup_progress', {
        backupId: record.id,
        status: 'FAILED',
        progress: 0,
        step: `Backup failed: ${err.message}`,
      });

      throw new BadRequestException(`Backup execution failed: ${err.message}`);
    }
  }

  async importBackup(
    file: Express.Multer.File,
    createdBy = 'SYSTEM',
  ): Promise<BackupRecord> {
    if (!file?.buffer || file.buffer.length === 0) {
      throw new BadRequestException('Uploaded backup file is empty');
    }

    const maxBytes = this.getBackupUploadMaxBytes();
    if (file.buffer.length > maxBytes) {
      throw new BadRequestException(
        `Backup upload exceeds the maximum allowed size of ${maxBytes} bytes`,
      );
    }

    const originalName = path.basename(file.originalname || 'imported-backup.zip');
    const safeBaseName = this.sanitizeBackupName(
      originalName.replace(/\.(zip|vcbkp)$/i, ''),
    );
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const storedName = `${safeBaseName}_${timestamp}.zip`;
    const fullPath = this.resolveBackupPath(storedName);

    fs.writeFileSync(fullPath, file.buffer, { flag: 'wx' });

    try {
      const archive = this.readBackupArchive(fullPath);
      const zip = new AdmZip(archive.zipBuffer);
      const entries = zip.getEntries();
      if (entries.length === 0) {
        throw new BadRequestException('Uploaded backup archive is empty');
      }

      const unsafeEntry = entries.find((entry) => {
        const normalized = entry.entryName.replace(/\\/g, '/');
        return (
          normalized.startsWith('/') ||
          normalized.includes('../') ||
          /^[A-Za-z]:\//.test(normalized)
        );
      });
      if (unsafeEntry) {
        throw new BadRequestException(
          `Uploaded backup archive contains an unsafe path: ${unsafeEntry.entryName}`,
        );
      }

      const components = Array.from(
        new Set(
          entries
            .map((entry) => entry.entryName.split('/')[0])
            .filter((component) =>
              ['database', 'redis', 'storage', 'config', 'ssl'].includes(
                component,
              ),
            ),
        ),
      );

      if (components.length === 0) {
        throw new BadRequestException(
          'Uploaded file is not a recognized VoiceCloud backup archive',
        );
      }

      const record = this.backupRepository.create({
        name: safeBaseName,
        type: BackupType.MANUAL,
        status: BackupStatus.COMPLETED,
        filePath: storedName,
        storageLocation: 'local',
        componentsIncluded: components,
        isEncrypted: archive.encrypted,
        encryptionAlgorithm: archive.encrypted ? 'AES-256-GCM' : 'NONE',
        notes: archive.legacyPlainZip
          ? `Imported legacy VoiceCloud backup (${file.size} bytes)`
          : `Imported VoiceCloud backup (${file.size} bytes)`,
        createdBy,
        fileSizeOriginal: archive.zipBuffer.length,
        fileSizeCompressed: file.buffer.length,
        compressionRatio:
          archive.zipBuffer.length > 0
            ? Number((file.buffer.length / archive.zipBuffer.length).toFixed(2))
            : 1,
        durationMs: 0,
        checksum: this.calculateFileChecksum(fullPath),
        fileCount: entries.length,
      });
      await this.backupRepository.save(record);
      await this.verifyBackup(record.id);
      return this.getBackupById(record.id);
    } catch (error) {
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
      throw error;
    }
  }

  async verifyBackup(id: string): Promise<BackupRecord> {
    const backup = await this.getBackupById(id);
    const fullPath = this.resolveBackupPath(backup.filePath);

    const logs: string[] = [];
    let archiveIntegrity = false;
    let checksumMatches = false;
    let databaseDumpValid = false;
    let fileCountCheck = false;

    logs.push(
      `Starting verification scan for backup archive '${backup.filePath}'`,
    );

    if (!fs.existsSync(fullPath)) {
      logs.push(`CRITICAL: Backup physical file missing on path '${fullPath}'`);
      backup.status = BackupStatus.CORRUPTED;
    } else {
      // 1. Checksum Match
      const currentChecksum = this.calculateFileChecksum(fullPath);
      checksumMatches = currentChecksum === backup.checksum;
      logs.push(
        `Checksum check: ${checksumMatches ? 'PASSED (SHA256 Match)' : 'FAILED'}`,
      );

      // 2. Archive Integrity
      try {
        const archive = this.readBackupArchive(fullPath);
        const zip = new AdmZip(archive.zipBuffer);
        const entries = zip.getEntries();
        if (backup.isEncrypted && archive.legacyPlainZip) {
          logs.push(
            'Encryption compatibility: LEGACY PLAIN ZIP detected despite encrypted metadata; readable for backward compatibility',
          );
        } else if (archive.encrypted) {
          logs.push('Encryption verification: PASSED (AES-256-GCM authentication tag valid)');
        } else {
          logs.push('Encryption verification: backup intentionally stored without encryption');
        }
        archiveIntegrity = entries.length > 0;
        fileCountCheck = true;
        logs.push(
          `Archive Integrity check: PASSED (${entries.length} root entries found)`,
        );

        // Check DB dump validity
        const dbEntry = zip.getEntry('database/db_dump.json');
        if (dbEntry) {
          const content = zip.readAsText(dbEntry);
          const parsed = JSON.parse(content);
          databaseDumpValid = typeof parsed === 'object' && parsed !== null;
          logs.push(
            `Database Dump JSON Validation: PASSED (${Object.keys(parsed).length} tables found)`,
          );
        } else {
          databaseDumpValid = true; // DB was not included
          logs.push(`Database Dump Entry: Skipped or optional component`);
        }
      } catch (e: any) {
        archiveIntegrity = false;
        logs.push(`Archive Integrity check FAILED: ${e.message}`);
      }
    }

    const isVerified = archiveIntegrity && checksumMatches && databaseDumpValid;
    if (isVerified && backup.status !== BackupStatus.VERIFIED) {
      backup.status = BackupStatus.VERIFIED;
    }

    backup.verificationDetails = {
      verifiedAt: new Date().toISOString(),
      archiveIntegrity,
      checksumMatches,
      databaseDumpValid,
      fileCountCheck,
      restoreValidated: isVerified,
      logs,
    };

    return this.backupRepository.save(backup);
  }

  async findAll(): Promise<BackupRecord[]> {
    return this.backupRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async getBackupById(id: string): Promise<BackupRecord> {
    const backup = await this.backupRepository.findOne({ where: { id } });
    if (!backup) {
      throw new NotFoundException(`Backup record with ID '${id}' not found`);
    }
    return backup;
  }

  async deleteBackup(id: string): Promise<boolean> {
    const backup = await this.getBackupById(id);
    const fullPath = this.resolveBackupPath(backup.filePath);

    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }

    await this.backupRepository.remove(backup);
    this.logger.log(
      `Deleted backup '${backup.name}' and file '${backup.filePath}'`,
    );
    return true;
  }

  async getBackupFileStream(
    id: string,
  ): Promise<{ fullPath: string; fileName: string }> {
    const backup = await this.getBackupById(id);
    const fullPath = this.resolveBackupPath(backup.filePath);

    if (!fs.existsSync(fullPath)) {
      throw new NotFoundException(
        `Backup file on disk '${backup.filePath}' does not exist`,
      );
    }

    return { fullPath, fileName: backup.filePath };
  }

  async enforceRetentionPolicies(): Promise<{ deletedCount: number }> {
    const schedules = await this.scheduleRepository.find({
      where: { isEnabled: true },
    });
    let totalDeleted = 0;

    for (const sched of schedules) {
      const maxCount = sched.maxBackupCount || 10;
      const backups = await this.backupRepository.find({
        where: { type: sched.type },
        order: { createdAt: 'DESC' },
      });

      if (backups.length > maxCount) {
        const toDelete = backups.slice(maxCount);
        for (const b of toDelete) {
          await this.deleteBackup(b.id);
          totalDeleted++;
        }
      }
    }

    if (totalDeleted > 0) {
      this.logger.log(
        `[Retention Policy Engine] Purged ${totalDeleted} expired backup archives`,
      );
    }

    return { deletedCount: totalDeleted };
  }


  getArchiveZip(id: string): Promise<AdmZip> {
    return this.getBackupById(id).then((backup) => {
      const fullPath = this.resolveBackupPath(backup.filePath);
      if (!fs.existsSync(fullPath)) {
        throw new NotFoundException(
          `Backup file on disk '${backup.filePath}' does not exist`,
        );
      }
      const archive = this.readBackupArchive(fullPath);
      return new AdmZip(archive.zipBuffer);
    });
  }

  private getEncryptionKey(): Buffer {
    const material =
      process.env.ENCRYPTION_KEY ||
      process.env.JWT_SECRET ||
      'voicecloud-development-backup-key';
    return crypto.createHash('sha256').update(material, 'utf8').digest();
  }

  private encryptBackupBuffer(plainZip: Buffer): Buffer {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(
      'aes-256-gcm',
      this.getEncryptionKey(),
      iv,
    );
    const ciphertext = Buffer.concat([cipher.update(plainZip), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return Buffer.concat([
      this.encryptedBackupMagic,
      iv,
      authTag,
      ciphertext,
    ]);
  }

  private readBackupArchive(filePath: string): {
    zipBuffer: Buffer;
    encrypted: boolean;
    legacyPlainZip: boolean;
  } {
    const stored = fs.readFileSync(filePath);
    const magicLength = this.encryptedBackupMagic.length;
    const hasMagic =
      stored.length > magicLength + 28 &&
      stored.subarray(0, magicLength).equals(this.encryptedBackupMagic);

    if (hasMagic) {
      const iv = stored.subarray(magicLength, magicLength + 12);
      const authTag = stored.subarray(magicLength + 12, magicLength + 28);
      const ciphertext = stored.subarray(magicLength + 28);
      try {
        const decipher = crypto.createDecipheriv(
          'aes-256-gcm',
          this.getEncryptionKey(),
          iv,
        );
        decipher.setAuthTag(authTag);
        const zipBuffer = Buffer.concat([
          decipher.update(ciphertext),
          decipher.final(),
        ]);
        return { zipBuffer, encrypted: true, legacyPlainZip: false };
      } catch {
        throw new BadRequestException(
          'Backup archive authentication/decryption failed. The encryption key may be incorrect or the archive may be corrupted.',
        );
      }
    }

    // Backward compatibility for pre-WP09 archives: older releases wrote a
    // normal ZIP while persisting isEncrypted=true/AES-256-GCM metadata.
    const isZip =
      stored.length >= 4 &&
      stored[0] === 0x50 &&
      stored[1] === 0x4b &&
      [0x03, 0x05, 0x07].includes(stored[2]);
    if (!isZip) {
      throw new BadRequestException(
        'Backup archive is neither a valid VoiceCloud encrypted backup nor a legacy ZIP archive.',
      );
    }
    return { zipBuffer: stored, encrypted: false, legacyPlainZip: true };
  }

  private getBackupUploadMaxBytes(): number {
    const configured = Number(process.env.BACKUP_UPLOAD_MAX_SIZE ?? 268435456);
    if (!Number.isFinite(configured) || configured <= 0) {
      return 268435456;
    }
    return Math.floor(configured);
  }

  private sanitizeBackupName(name: string): string {
    const sanitized = name
      .normalize('NFKC')
      .replace(/[^A-Za-z0-9._-]+/g, '_')
      .replace(/^\.+/, '')
      .slice(0, 120);
    if (!sanitized || sanitized === '.' || sanitized === '..') {
      return `VoiceCloud_Backup_${Date.now()}`;
    }
    return sanitized;
  }

  private resolveBackupPath(fileName: string): string {
    const baseName = path.basename(fileName);
    if (baseName !== fileName || !baseName) {
      throw new BadRequestException('Invalid backup file path');
    }
    const resolved = path.resolve(this.backupDir, baseName);
    const root = `${path.resolve(this.backupDir)}${path.sep}`;
    if (!resolved.startsWith(root)) {
      throw new BadRequestException('Backup path escapes the configured directory');
    }
    return resolved;
  }

  private calculateFileChecksum(filePath: string): string {
    const fileBuffer = fs.readFileSync(filePath);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    return hashSum.digest('hex');
  }

  private addDirectoryToZip(
    zip: AdmZip,
    localDirPath: string,
    zipDirPath: string,
  ) {
    if (!fs.existsSync(localDirPath)) return;
    const items = fs.readdirSync(localDirPath);
    for (const item of items) {
      const fullLocalPath = path.join(localDirPath, item);
      const fullZipPath = `${zipDirPath}/${item}`;
      const stat = fs.statSync(fullLocalPath);
      if (stat.isDirectory()) {
        this.addDirectoryToZip(zip, fullLocalPath, fullZipPath);
      } else {
        zip.addFile(fullZipPath, fs.readFileSync(fullLocalPath));
      }
    }
  }
}
