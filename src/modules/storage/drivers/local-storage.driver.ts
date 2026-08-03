import { Injectable, Logger, Optional, Inject } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import {
  IStorageDriver,
  LegacyPublicObject,
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
  private readonly uploadDir: string;
  private readonly privateDir: string;

  constructor(
    @Optional()
    @Inject('CUSTOM_PRIVATE_DIR')
    customPrivateDir?: string,
    @Optional()
    @Inject('CUSTOM_PUBLIC_DIR')
    customPublicDir?: string,
  ) {
    this.uploadDir = path.resolve(
      customPublicDir ?? path.join(process.cwd(), 'uploads'),
    );
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

  async readLegacyPublic(reference: string): Promise<LegacyPublicObject> {
    const targetPath = this.resolveLegacyPublicPath(reference);
    this.verifyLegacyPublicSymlinkSafety(targetPath);

    const stats = await fs.promises.stat(targetPath);
    if (!stats.isFile()) {
      throw new Error('Legacy public reference is not a regular file');
    }

    const originalFilename = path.basename(targetPath);
    return {
      buffer: await fs.promises.readFile(targetPath),
      originalFilename,
      mimeType: this.mimeTypeForLegacyFilename(originalFilename),
      size: stats.size,
    };
  }

  async deleteLegacyPublic(reference: string): Promise<boolean> {
    const targetPath = this.resolveLegacyPublicPath(reference);
    if (!fs.existsSync(targetPath)) {
      return false;
    }
    this.verifyLegacyPublicSymlinkSafety(targetPath);
    const stats = await fs.promises.stat(targetPath);
    if (!stats.isFile()) {
      throw new Error('Legacy public reference is not a regular file');
    }
    await fs.promises.unlink(targetPath);
    return true;
  }

  async quarantineLegacyPublic(
    reference: string,
    privateKey: string,
  ): Promise<void> {
    const sourcePath = this.resolveLegacyPublicPath(reference);
    this.verifyLegacyPublicSymlinkSafety(sourcePath);
    const targetPath = this.resolvePrivatePath(privateKey);
    this.verifySymlinkSafety(targetPath);
    if (fs.existsSync(targetPath)) {
      throw new Error('Legacy quarantine target already exists');
    }
    await fs.promises.mkdir(path.dirname(targetPath), {
      recursive: true,
      mode: 0o700,
    });
    await fs.promises.rename(sourcePath, targetPath);
    await fs.promises.chmod(targetPath, 0o600);
  }

  private resolveLegacyPublicPath(reference: string): string {
    const trimmed = (reference || '').trim();
    if (!trimmed || trimmed.includes('\0') || trimmed.includes('\\')) {
      throw new Error('Unsafe legacy public reference');
    }

    let pathname = trimmed;
    if (/^https?:\/\//i.test(trimmed)) {
      pathname = new URL(trimmed).pathname;
    } else if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
      throw new Error('Unsupported legacy public reference scheme');
    } else {
      pathname = trimmed.split(/[?#]/, 1)[0];
    }

    let decoded: string;
    try {
      decoded = decodeURIComponent(pathname);
    } catch {
      throw new Error('Malformed legacy public reference encoding');
    }
    if (decoded.includes('\0') || decoded.includes('\\')) {
      throw new Error('Unsafe legacy public reference');
    }

    const relativeReference = decoded.replace(/^\/+/, '');
    const segments = relativeReference.split('/');
    if (
      segments[0] !== 'uploads' ||
      segments.length < 2 ||
      segments.some(
        (segment) => !segment || segment === '.' || segment === '..',
      )
    ) {
      throw new Error('Legacy public reference must be inside /uploads');
    }

    const targetPath = path.resolve(this.uploadDir, ...segments.slice(1));
    const relative = path.relative(this.uploadDir, targetPath);
    if (
      relative === '' ||
      relative.startsWith('..') ||
      path.isAbsolute(relative)
    ) {
      throw new Error('Legacy public reference escapes the upload root');
    }
    if (!fs.existsSync(targetPath)) {
      throw new Error('Legacy public source file was not found');
    }
    return targetPath;
  }

  private verifyLegacyPublicSymlinkSafety(targetPath: string): void {
    const canonicalUploadRoot = fs.realpathSync(this.uploadDir);
    const relativePath = path.relative(this.uploadDir, targetPath);
    let current = this.uploadDir;

    for (const part of relativePath.split(path.sep)) {
      current = path.join(current, part);
      if (!fs.existsSync(current)) {
        throw new Error('Legacy public source file was not found');
      }
      if (fs.lstatSync(current).isSymbolicLink()) {
        throw new Error('Symbolic link detected in legacy public path');
      }
      const canonicalCurrent = fs.realpathSync(current);
      const relative = path.relative(canonicalUploadRoot, canonicalCurrent);
      if (relative.startsWith('..') || path.isAbsolute(relative)) {
        throw new Error('Legacy public path escapes the upload root');
      }
    }
  }

  private mimeTypeForLegacyFilename(filename: string): string {
    switch (path.extname(filename).toLowerCase()) {
      case '.jpg':
      case '.jpeg':
        return 'image/jpeg';
      case '.png':
        return 'image/png';
      case '.webp':
        return 'image/webp';
      case '.pdf':
        return 'application/pdf';
      default:
        return 'application/octet-stream';
    }
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
