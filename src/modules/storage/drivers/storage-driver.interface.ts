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

export interface LegacyPublicObject {
  buffer: Buffer;
  originalFilename: string;
  mimeType: string;
  size: number;
}

export interface IStorageDriver {
  readonly providerType: string;

  upload(
    file: Express.Multer.File,
    category: MediaCategory,
  ): Promise<StorageUploadResult>;

  delete(filePath: string): Promise<boolean>;

  getMetadata(filePath: string): Promise<StorageMetadataResult | null>;

  generatePublicUrl(filePath: string): string;

  generateInternalUrl(filePath: string): string;

  writePrivate(key: string, data: Buffer, mimeType?: string): Promise<void>;

  readPrivate(key: string): Promise<Buffer>;

  existsPrivate(key: string): Promise<boolean>;

  deletePrivate(key: string): Promise<boolean>;

  readLegacyPublic(reference: string): Promise<LegacyPublicObject>;

  deleteLegacyPublic(reference: string): Promise<boolean>;

  quarantineLegacyPublic(reference: string, privateKey: string): Promise<void>;
}
