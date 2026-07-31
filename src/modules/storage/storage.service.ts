import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as path from 'path';
import { MediaFile } from './entities/media-file.entity';
import { StorageFactory } from './storage.factory';
import { MediaCategory } from './enums/media-category.enum';
import { UploadMediaDto } from './dto/upload-media.dto';
import { QueryMediaDto } from './dto/query-media.dto';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  constructor(
    @InjectRepository(MediaFile)
    private readonly mediaRepository: Repository<MediaFile>,
    private readonly storageFactory: StorageFactory,
  ) {}

  validateFile(file: Express.Multer.File, category: MediaCategory): void {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Protection against directory traversal, null bytes, or malicious filenames
    if (
      file.originalname &&
      (file.originalname.includes('..') ||
        file.originalname.includes('/') ||
        file.originalname.includes('\\') ||
        file.originalname.includes('\0'))
    ) {
      throw new BadRequestException('Invalid filename detected');
    }

    const rawExt = path.extname(file.originalname).toLowerCase();
    const mime = file.mimetype.toLowerCase();

    // Block executable and dangerous file types across all categories
    const DANGEROUS_EXTENSIONS = [
      '.exe',
      '.sh',
      '.bat',
      '.cmd',
      '.msi',
      '.php',
      '.phtml',
      '.phar',
      '.jsp',
      '.asp',
      '.aspx',
      '.js',
      '.ts',
      '.py',
      '.rb',
      '.pl',
      '.cgi',
      '.dll',
      '.so',
      '.dylib',
      '.vbs',
      '.ps1',
      '.scr',
      '.com',
      '.htm',
      '.html',
    ];

    const DANGEROUS_MIMES = [
      'application/x-executable',
      'application/x-sharedlib',
      'application/x-sh',
      'application/x-bat',
      'application/x-msdownload',
      'application/x-msdos-program',
      'text/x-php',
      'application/x-httpd-php',
      'text/javascript',
      'application/javascript',
      'text/x-python',
      'text/x-shellscript',
      'text/html',
    ];

    if (
      DANGEROUS_EXTENSIONS.includes(rawExt) ||
      DANGEROUS_MIMES.includes(mime)
    ) {
      throw new BadRequestException(
        `File upload rejected: Executable or unsupported dangerous file type (${rawExt})`,
      );
    }

    // Sanitize filename to avoid shell/path characters
    file.originalname = path
      .basename(file.originalname)
      .replace(/[^a-zA-Z0-9_.-]/g, '_');

    // Size limits (in bytes)
    const MAX_5MB = 5 * 1024 * 1024;
    const MAX_10MB = 10 * 1024 * 1024;
    const MAX_20MB = 20 * 1024 * 1024;

    const imageCategories = [
      MediaCategory.AVATAR,
      MediaCategory.ROOM_COVER,
      MediaCategory.ROOM_THUMBNAIL,
      MediaCategory.ROOM_BG,
      MediaCategory.GIFT_ICON,
      MediaCategory.GIFT_PREVIEW,
      MediaCategory.ANNOUNCEMENT_BANNER,
      MediaCategory.ANNOUNCEMENT_THUMBNAIL,
      MediaCategory.HOST_PHOTO,
      MediaCategory.AGENCY_LOGO,
      MediaCategory.AGENCY_BANNER,
      MediaCategory.CHAT_IMAGE,
    ];

    if (imageCategories.includes(category)) {
      const allowedExts = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
      const allowedMimes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        'image/gif',
      ];

      if (!allowedExts.includes(rawExt) || !allowedMimes.includes(mime)) {
        throw new BadRequestException(
          `Invalid file type for image category ${category}. Allowed extensions: jpg, jpeg, png, webp, gif`,
        );
      }

      const maxSize = [MediaCategory.AVATAR, MediaCategory.GIFT_ICON].includes(
        category,
      )
        ? MAX_5MB
        : MAX_10MB;

      if (file.size > maxSize) {
        throw new BadRequestException(
          `File size exceeds limit of ${maxSize / (1024 * 1024)}MB for category ${category}`,
        );
      }
      return;
    }

    if (category === MediaCategory.GIFT_ANIMATION) {
      const allowedExts = ['.json', '.svga', '.gif', '.mp4', '.webm'];
      if (
        !allowedExts.includes(rawExt) &&
        !mime.includes('json') &&
        !mime.includes('video') &&
        !mime.includes('gif')
      ) {
        throw new BadRequestException(
          'Invalid file type for gift animation. Allowed extensions: json, svga, gif, mp4, webm',
        );
      }
      if (file.size > MAX_20MB) {
        throw new BadRequestException('Gift animation file exceeds 20MB limit');
      }
      return;
    }

    if (category === MediaCategory.CHAT_AUDIO) {
      const allowedExts = ['.mp3', '.wav', '.ogg', '.m4a', '.webm', '.aac'];
      if (!allowedExts.includes(rawExt) && !mime.includes('audio')) {
        throw new BadRequestException(
          'Invalid audio file type. Allowed extensions: mp3, wav, ogg, m4a, webm, aac',
        );
      }
      if (file.size > MAX_20MB) {
        throw new BadRequestException('Audio file exceeds 20MB limit');
      }
      return;
    }

    if (
      [
        MediaCategory.ANNOUNCEMENT_ATTACHMENT,
        MediaCategory.HOST_ID,
        MediaCategory.HOST_DOCUMENT,
        MediaCategory.CHAT_DOCUMENT,
        MediaCategory.CHAT_ATTACHMENT,
      ].includes(category)
    ) {
      if (file.size > MAX_20MB) {
        throw new BadRequestException('Document attachment exceeds 20MB limit');
      }
      return;
    }

    // Default size check for any other category
    if (file.size > MAX_20MB) {
      throw new BadRequestException(
        'File size exceeds maximum allowed limit of 20MB',
      );
    }
  }

  async uploadFile(
    file: Express.Multer.File,
    dto: UploadMediaDto,
    uploadedById?: string,
  ): Promise<MediaFile> {
    this.validateFile(file, dto.category);

    const driver = await this.storageFactory.getActiveDriver();
    const result = await driver.upload(file, dto.category);

    const media = this.mediaRepository.create({
      filename: result.filename,
      storedName: result.storedName,
      filePath: result.filePath,
      publicUrl: result.publicUrl,
      internalUrl: result.internalUrl,
      mimeType: result.mimeType,
      size: result.size,
      category: dto.category,
      width: dto.width ?? null,
      height: dto.height ?? null,
      uploadedById: uploadedById ?? null,
      entityType: dto.entityType ?? null,
      entityId: dto.entityId ?? null,
      metadata: {
        originalName: file.originalname,
        uploadedAt: new Date().toISOString(),
      },
    });

    const saved = await this.mediaRepository.save(media);
    this.logger.log(`Saved MediaFile metadata with ID ${saved.id}`);
    return saved;
  }

  async getMediaById(id: string): Promise<MediaFile> {
    const media = await this.mediaRepository.findOne({ where: { id } });
    if (!media) {
      throw new NotFoundException(`Media file with ID ${id} not found`);
    }
    return media;
  }

  async queryMedia(dto: QueryMediaDto): Promise<MediaFile[]> {
    const query = this.mediaRepository.createQueryBuilder('media');

    if (dto.category) {
      query.andWhere('media.category = :category', { category: dto.category });
    }
    if (dto.entityType) {
      query.andWhere('media.entityType = :entityType', {
        entityType: dto.entityType,
      });
    }
    if (dto.entityId) {
      query.andWhere('media.entityId = :entityId', { entityId: dto.entityId });
    }
    if (dto.uploadedById) {
      query.andWhere('media.uploadedById = :uploadedById', {
        uploadedById: dto.uploadedById,
      });
    }

    query.orderBy('media.createdAt', 'DESC');
    return query.getMany();
  }

  async replaceFile(
    id: string,
    file: Express.Multer.File,
    dto: UploadMediaDto,
    uploadedById?: string,
  ): Promise<MediaFile> {
    const existing = await this.getMediaById(id);

    this.validateFile(file, dto.category);
    const driver = await this.storageFactory.getActiveDriver();

    // Delete old physical file
    await driver.delete(existing.filePath);

    // Upload new physical file
    const result = await driver.upload(file, dto.category);

    existing.filename = result.filename;
    existing.storedName = result.storedName;
    existing.filePath = result.filePath;
    existing.publicUrl = result.publicUrl;
    existing.internalUrl = result.internalUrl;
    existing.mimeType = result.mimeType;
    existing.size = result.size;
    existing.category = dto.category;
    if (dto.width !== undefined) existing.width = dto.width;
    if (dto.height !== undefined) existing.height = dto.height;
    if (uploadedById) existing.uploadedById = uploadedById;
    if (dto.entityType) existing.entityType = dto.entityType;
    if (dto.entityId) existing.entityId = dto.entityId;

    const updated = await this.mediaRepository.save(existing);
    this.logger.log(`Replaced MediaFile with ID ${updated.id}`);
    return updated;
  }

  async deleteFile(id: string): Promise<boolean> {
    const media = await this.getMediaById(id);
    const driver = await this.storageFactory.getActiveDriver();
    await driver.delete(media.filePath);
    await this.mediaRepository.remove(media);
    this.logger.log(`Deleted MediaFile record and physical file for ID ${id}`);
    return true;
  }

  async generatePublicUrl(filePath: string): Promise<string> {
    const driver = await this.storageFactory.getActiveDriver();
    return driver.generatePublicUrl(filePath);
  }

  async generateInternalUrl(filePath: string): Promise<string> {
    const driver = await this.storageFactory.getActiveDriver();
    return driver.generateInternalUrl(filePath);
  }
}
