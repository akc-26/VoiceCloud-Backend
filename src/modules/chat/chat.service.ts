import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { StorageService } from '../storage/storage.service';
import { MediaCategory } from '../storage/enums/media-category.enum';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(private readonly storageService: StorageService) {}

  async uploadAttachment(
    file: Express.Multer.File,
    type: 'image' | 'document' | 'audio' | 'attachment',
    roomId?: string,
    userId?: string,
  ) {
    if (!file) throw new BadRequestException('Attachment file is required');

    let category = MediaCategory.CHAT_ATTACHMENT;
    if (type === 'image') category = MediaCategory.CHAT_IMAGE;
    if (type === 'document') category = MediaCategory.CHAT_DOCUMENT;
    if (type === 'audio') category = MediaCategory.CHAT_AUDIO;

    const media = await this.storageService.uploadFile(
      file,
      {
        category,
        entityType: 'chat',
        entityId: roomId ?? 'direct',
      },
      userId,
    );

    this.logger.log(
      `Uploaded chat attachment of type ${type} for user ${userId}`,
    );

    return {
      message: 'Chat attachment uploaded successfully',
      attachmentType: type,
      attachmentUrl: media.publicUrl,
      media,
    };
  }
}
