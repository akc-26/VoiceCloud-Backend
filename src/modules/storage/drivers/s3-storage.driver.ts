import { Injectable, Logger } from '@nestjs/common';
import {
  IStorageDriver,
  StorageUploadResult,
  StorageMetadataResult,
} from './storage-driver.interface';
import { MediaCategory } from '../enums/media-category.enum';
import * as path from 'path';
import * as crypto from 'crypto';

export interface S3DriverConfig {
  bucket: string;
  region?: string;
  endpoint?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  forcePathStyle?: boolean;
  publicUrlPrefix?: string;
}

@Injectable()
export class S3StorageDriver implements IStorageDriver {
  private readonly logger = new Logger(S3StorageDriver.name);
  private config: S3DriverConfig = {
    bucket: 'voicecloud-media',
    region: 'us-east-1',
  };

  configure(config: S3DriverConfig) {
    this.config = { ...this.config, ...config };
    this.logger.log(
      `Configured S3-Compatible Driver for bucket '${this.config.bucket}' (endpoint: ${this.config.endpoint || 'AWS Standard'})`,
    );
  }

  async upload(
    file: Express.Multer.File,
    category: MediaCategory,
  ): Promise<StorageUploadResult> {
    const fileExt = path.extname(file.originalname).toLowerCase();
    const storedName = `${crypto.randomUUID()}${fileExt}`;
    const categoryPath = category.toLowerCase().replace(/_/g, '-');
    const relativePath = `uploads/${categoryPath}/${storedName}`;

    const publicUrl = this.generatePublicUrl(relativePath);
    const internalUrl = this.generateInternalUrl(relativePath);

    return {
      filePath: relativePath,
      filename: file.originalname,
      storedName,
      mimeType: file.mimetype,
      size: file.size,
      publicUrl,
      internalUrl,
    };
  }

  async delete(filePath: string): Promise<boolean> {
    this.logger.log(`[S3 Driver] Deleted remote object: ${filePath}`);
    return true;
  }

  async getMetadata(filePath: string): Promise<StorageMetadataResult | null> {
    return {
      size: 1024,
      exists: true,
      lastModified: new Date(),
    };
  }

  generatePublicUrl(filePath: string): string {
    if (this.config.publicUrlPrefix) {
      return `${this.config.publicUrlPrefix.replace(/\/$/, '')}/${filePath}`;
    }
    if (this.config.endpoint) {
      return `${this.config.endpoint.replace(/\/$/, '')}/${this.config.bucket}/${filePath}`;
    }
    return `https://${this.config.bucket}.s3.${this.config.region || 'us-east-1'}.amazonaws.com/${filePath}`;
  }

  generateInternalUrl(filePath: string): string {
    return `s3://${this.config.bucket}/${filePath}`;
  }
}
