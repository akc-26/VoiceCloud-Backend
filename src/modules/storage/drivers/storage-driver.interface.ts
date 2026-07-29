import { MediaCategory } from '../enums/media-category.enum';

export interface StorageUploadResult {
  filePath: string;
  filename: string;
  storedName: string;
  mimeType: string;
  size: number;
  publicUrl: string;
  internalUrl: string;
}

export interface StorageMetadataResult {
  size: number;
  exists: boolean;
  lastModified?: Date;
}

export interface IStorageDriver {
  upload(
    file: Express.Multer.File,
    category: MediaCategory,
  ): Promise<StorageUploadResult>;

  delete(filePath: string): Promise<boolean>;

  getMetadata(filePath: string): Promise<StorageMetadataResult | null>;

  generatePublicUrl(filePath: string): string;

  generateInternalUrl(filePath: string): string;
}
