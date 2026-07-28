import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import {
  IStorageDriver,
  StorageUploadResult,
  StorageMetadataResult,
} from './storage-driver.interface';
import { MediaCategory } from '../enums/media-category.enum';

@Injectable()
export class LocalStorageDriver implements IStorageDriver {
  private readonly logger = new Logger(LocalStorageDriver.name);
  private readonly uploadDir = path.join(process.cwd(), 'uploads');

  constructor() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
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
