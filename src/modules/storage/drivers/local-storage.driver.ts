import { Injectable, Logger, Optional, Inject } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import {
  IStorageDriver,
  StorageUploadResult,
  StorageMetadataResult,
} from './storage-driver.interface';
import { MediaCategory } from '../enums/media-category.enum';
import {
  validatePrivateStoragePath,
  validatePrivateStorageKey,
} from '../utils/private-storage-key.util';

@Injectable()
export class LocalStorageDriver implements IStorageDriver {
  readonly providerType = 'local';
  private readonly logger = new Logger(LocalStorageDriver.name);
  private readonly uploadDir = path.join(process.cwd(), 'uploads');
  private readonly privateDir: string;

  constructor(
    @Optional()
    @Inject('CUSTOM_PRIVATE_DIR')
    customPrivateDir?: string,
  ) {
    this.privateDir = validatePrivateStoragePath(
      customPrivateDir ?? process.env.PRIVATE_STORAGE_PATH,
      this.uploadDir,
    );
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
    if (!fs.existsSync(this.privateDir)) {
      fs.mkdirSync(this.privateDir, { recursive: true, mode: 0o700 });
    }

    if (fs.existsSync(this.privateDir)) {
      if (fs.lstatSync(this.privateDir).isSymbolicLink()) {
        throw new Error('PRIVATE_STORAGE_PATH cannot be a symbolic link');
      }
      const canonicalPrivate = fs.realpathSync(this.privateDir);
      const canonicalPublic = fs.existsSync(this.uploadDir)
        ? fs.realpathSync(this.uploadDir)
        : path.resolve(this.uploadDir);

      if (canonicalPrivate === canonicalPublic) {
        throw new Error(
          'PRIVATE_STORAGE_PATH cannot be equal to the public upload root',
        );
      }
      const relative = path.relative(canonicalPublic, canonicalPrivate);
      if (
        relative === '' ||
        (!relative.startsWith('..') && !path.isAbsolute(relative))
      ) {
        throw new Error(
          'PRIVATE_STORAGE_PATH cannot be located inside the public upload root',
        );
      }
    }
  }

  resolvePrivatePath(key: string): string {
    validatePrivateStorageKey(key);

    const targetPath = path.resolve(this.privateDir, key);
    const relative = path.relative(this.privateDir, targetPath);

    if (
      relative === '' ||
      relative.startsWith('..') ||
      path.isAbsolute(relative)
    ) {
      throw new Error('Path confinement violation: key escapes private root');
    }

    return targetPath;
  }

  private verifySymlinkSafety(targetPath: string): void {
    const realPrivateDir = fs.existsSync(this.privateDir)
      ? fs.realpathSync(this.privateDir)
      : path.resolve(this.privateDir);

    const relativeKey = path.relative(this.privateDir, targetPath);
    const parts = relativeKey.split(path.sep);

    let current = this.privateDir;
    for (let i = 0; i < parts.length; i++) {
      current = path.join(current, parts[i]);
      if (fs.existsSync(current)) {
        const lstat = fs.lstatSync(current);
        if (lstat.isSymbolicLink()) {
          throw new Error('Symbolic link detected in path component');
        }
        const realCurrent = fs.realpathSync(current);
        const rel = path.relative(realPrivateDir, realCurrent);
        if (rel.startsWith('..') || path.isAbsolute(rel)) {
          throw new Error('Symbolic link escape detected in path component');
        }
      }
    }
  }

  async writePrivate(
    key: string,
    data: Buffer,
    _mimeType?: string,
  ): Promise<void> {
    const targetPath = this.resolvePrivatePath(key);
    this.verifySymlinkSafety(targetPath);

    const parentDir = path.dirname(targetPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true, mode: 0o700 });
    }

    await fs.promises.writeFile(targetPath, data, { mode: 0o600 });
    this.logger.log(`Wrote private object to key ${key}`);
  }

  async readPrivate(key: string): Promise<Buffer> {
    const targetPath = this.resolvePrivatePath(key);
    if (!fs.existsSync(targetPath)) {
      throw new Error(`Private file not found: ${key}`);
    }
    this.verifySymlinkSafety(targetPath);
    return fs.promises.readFile(targetPath);
  }

  async existsPrivate(key: string): Promise<boolean> {
    const targetPath = this.resolvePrivatePath(key);
    if (!fs.existsSync(targetPath)) {
      return false;
    }
    this.verifySymlinkSafety(targetPath);
    return true;
  }

  async deletePrivate(key: string): Promise<boolean> {
    const targetPath = this.resolvePrivatePath(key);
    if (!fs.existsSync(targetPath)) {
      return false;
    }
    this.verifySymlinkSafety(targetPath);
    await fs.promises.unlink(targetPath);
    return true;
  }

  async upload(
    file: Express.Multer.File,
    category: MediaCategory,
  ): Promise<StorageUploadResult> {
    const categoryDir = path.join(this.uploadDir, category);
    if (!fs.existsSync(categoryDir)) {
      fs.mkdirSync(categoryDir, { recursive: true });
    }

    const rawExt = path.extname(file.originalname).toLowerCase();
    const fileExt = rawExt || '.bin';
    const uniqueName = `${crypto.randomUUID()}${fileExt}`;
    const targetPath = path.join(categoryDir, uniqueName);

    // Path traversal check
    const normalizedCategory = category.replace(/[^a-zA-Z0-9_-]/g, '');
    const relativeCategoryPath = `uploads/${normalizedCategory}/${uniqueName}`;
    if (relativeCategoryPath.includes('..')) {
      throw new Error('Invalid path traversal attempt');
    }

    await fs.promises.writeFile(targetPath, file.buffer);

    const publicUrl = `/${relativeCategoryPath}`;
    const internalUrl = `/${relativeCategoryPath}`;

    this.logger.log(`File uploaded locally to ${targetPath}`);

    return {
      filePath: relativeCategoryPath,
      filename: file.originalname,
      storedName: uniqueName,
      mimeType: file.mimetype,
      size: file.size,
      publicUrl,
      internalUrl,
    };
  }

  async delete(filePath: string): Promise<boolean> {
    const cleanPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
    const fullPath = path.join(process.cwd(), cleanPath);

    if (!fullPath.startsWith(this.uploadDir)) {
      this.logger.warn(
        `Attempted delete outside upload directory: ${filePath}`,
      );
      return false;
    }

    if (fs.existsSync(fullPath)) {
      await fs.promises.unlink(fullPath);
      this.logger.log(`Deleted file: ${filePath}`);
      return true;
    }
    return false;
  }

  async getMetadata(filePath: string): Promise<StorageMetadataResult | null> {
    const cleanPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
    const fullPath = path.join(process.cwd(), cleanPath);

    if (!fullPath.startsWith(this.uploadDir) || !fs.existsSync(fullPath)) {
      return null;
    }

    const stats = await fs.promises.stat(fullPath);
    return {
      size: stats.size,
      exists: true,
      lastModified: stats.mtime,
    };
  }

  generatePublicUrl(filePath: string): string {
    if (filePath.startsWith('/')) {
      return filePath;
    }
    return `/${filePath}`;
  }

  generateInternalUrl(filePath: string): string {
    if (filePath.startsWith('/')) {
      return filePath;
    }
    return `/${filePath}`;
  }
}
